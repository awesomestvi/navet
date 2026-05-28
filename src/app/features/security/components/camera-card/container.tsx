import type { HassEntity } from 'home-assistant-js-websocket';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { shallow } from 'zustand/shallow';
import { usePlatformCameraPresentation } from '@/app/features/security/hooks/resolve-platform-camera-presentation';
import { useCameraRegistryDeviceTopology, useHomeAssistant } from '@/app/hooks';
import type { PlatformCameraStreamType } from '@/app/platform/provider-feature-models';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { integrationCameraFeatureService } from '@/app/services/integration-camera-feature.service';
import type { IntegrationStore } from '@/app/stores/integration-store';
import { homeAssistantSelectors, settingsSelectors } from '@/app/stores/selectors';
import {
  type CameraFeedMode,
  type CameraGo2RtcConfig,
  type CameraGo2RtcDefaults,
  type CameraViewMode,
  resolveCameraGo2RtcConfig,
  useSettingsStore,
} from '@/app/stores/settings-store';
import { resolveHomeAssistantProxyUrl } from '@/app/utils/home-assistant-url';
import { useAuthSession } from '@/auth/AuthProvider';
import { CameraLiveViewer } from './camera-live-viewer';
import { CameraSettingsDialog } from './camera-settings-dialog';
import { CameraStreamPlayer } from './camera-stream-player';
import {
  appendCameraCacheBuster,
  type CameraImageSource,
  type CameraImageSourceKind,
  type CameraStreamType,
  getCameraAutoRefreshInterval,
  normalizeCameraSnapshotUrl,
  readCameraStreamTypes,
  resolveCameraMjpegStreamUrl,
  resolveDashboardCameraViewMode,
  resolveViewerInitialCameraViewMode,
} from './camera-view-mode';
import type { CameraCardProps } from './types';
import { CameraCardView } from './view';

function isMotionEntity(
  entityId: string,
  entity: { attributes?: Record<string, unknown> } | undefined
) {
  const deviceClass =
    typeof entity?.attributes?.device_class === 'string' ? entity.attributes.device_class : '';
  const searchText =
    `${entityId} ${typeof entity?.attributes?.friendly_name === 'string' ? entity.attributes.friendly_name : ''}`.toLowerCase();

  return (
    deviceClass === 'motion' ||
    deviceClass === 'occupancy' ||
    searchText.includes('motion') ||
    searchText.includes('occupancy') ||
    searchText.includes('presence') ||
    searchText.includes('pir')
  );
}

function parseTimestamp(value: unknown): number | null {
  if (typeof value !== 'string' || value.length === 0) {
    return null;
  }

  const timestamp = new Date(value).getTime();
  return Number.isNaN(timestamp) ? null : timestamp;
}

function readImageUrl(value: unknown): string | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : undefined;
}

function resolveHomeAssistantImageUrl(imageUrl: string | undefined) {
  if (!imageUrl) {
    return undefined;
  }

  return resolveHomeAssistantProxyUrl(imageUrl) ?? imageUrl;
}

function readFrontendStreamTypes(value: unknown) {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const raw = (value as { frontend_stream_types?: unknown }).frontend_stream_types;
  return readCameraStreamTypes(raw);
}

function canUseGo2RtcCameraCard() {
  return (
    typeof customElements !== 'undefined' &&
    Boolean(customElements.get('webrtc-camera')) &&
    Boolean(homeAssistantService.getPanelHass())
  );
}

const EMPTY_DEVICE_RECORD: Record<string, HassEntity | undefined> = {};
const CAMERA_CLOCK_INTERVAL_MS = 30_000;
const CAMERA_STREAM_RETRY_DELAY_MS = 5_000;
const CAMERA_CAPABILITIES_RETRY_DELAY_MS = 3_000;
const CAMERA_CAPABILITIES_MAX_RETRIES = 5;
const cameraClockSubscribers = new Set<() => void>();
let cameraClockNow = Date.now();
let cameraClockIntervalId: number | null = null;

function subscribeToCameraClock(callback: () => void) {
  cameraClockSubscribers.add(callback);

  if (cameraClockIntervalId === null) {
    cameraClockNow = Date.now();
    cameraClockIntervalId = window.setInterval(() => {
      cameraClockNow = Date.now();
      for (const subscriber of cameraClockSubscribers) {
        subscriber();
      }
    }, CAMERA_CLOCK_INTERVAL_MS);
  }

  return () => {
    cameraClockSubscribers.delete(callback);

    if (cameraClockSubscribers.size === 0 && cameraClockIntervalId !== null) {
      window.clearInterval(cameraClockIntervalId);
      cameraClockIntervalId = null;
    }
  };
}

function getCameraClockSnapshot() {
  return cameraClockNow;
}

function useCameraClock() {
  return useSyncExternalStore(
    subscribeToCameraClock,
    getCameraClockSnapshot,
    getCameraClockSnapshot
  );
}

function useCameraCardVisibility() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(true);

  useEffect(() => {
    const element = cardRef.current;
    if (!element || typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry?.isIntersecting ?? true);
      },
      { threshold: 0.1 }
    );

    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return { cardRef, isVisible };
}

export const CameraCardContainer = memo(function CameraCardContainer({
  id,
  name,
  room,
  entityPicture: initialEntityPicture,
  supportedFeatures: initialSupportedFeatures,
  isStreamCapable: initialIsStreamCapable,
  size,
  isEditMode,
}: CameraCardProps) {
  const { runtime } = useAuthSession();
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const cameraDashboardViewMode = useSettingsStore(
    settingsSelectors.cameraDashboardViewModeForEntity(id)
  );
  const hasCameraViewModeOverride = useSettingsStore(
    settingsSelectors.hasCameraViewModeOverrideForEntity(id)
  );
  const cameraFeedMode = useSettingsStore(settingsSelectors.cameraFeedModeForEntity(id));
  const cameraGo2RtcDefaults = useSettingsStore(settingsSelectors.cameraGo2RtcDefaults);
  const go2RtcConfig = useSettingsStore(settingsSelectors.cameraGo2RtcConfigForEntity(id));
  const updateCameraViewMode = useSettingsStore(settingsSelectors.updateCameraViewMode);
  const updateCameraFeedMode = useSettingsStore(settingsSelectors.updateCameraFeedMode);
  const updateCameraGo2RtcDefaults = useSettingsStore(settingsSelectors.updateCameraGo2RtcDefaults);
  const updateCameraGo2RtcConfig = useSettingsStore(settingsSelectors.updateCameraGo2RtcConfig);
  const { siblingIds: deviceEntityIds } = useCameraRegistryDeviceTopology(id);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerCameraViewMode, setViewerCameraViewMode] = useState<CameraViewMode>('live');
  const [failedStreamTypes, setFailedStreamTypes] = useState<CameraImageSourceKind[]>([]);
  const [frontendStreamTypes, setFrontendStreamTypes] = useState<CameraStreamType[]>([]);
  const [hasGo2RtcCustomCard, setHasGo2RtcCustomCard] = useState(canUseGo2RtcCameraCard);
  const streamRetryTimeoutRef = useRef<number | null>(null);
  const { cardRef, isVisible } = useCameraCardVisibility();
  const now = useCameraClock();

  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const liveEntityPicture =
    readImageUrl(liveAttrs?.entity_picture) ?? readImageUrl(liveAttrs?.entity_picture_local);
  const initialSnapshotUrl = readImageUrl(initialEntityPicture);
  const baseSnapshotUrl = normalizeCameraSnapshotUrl(
    liveEntityPicture ? resolveHomeAssistantImageUrl(liveEntityPicture) : initialSnapshotUrl
  );

  // Append cache-busting param so refresh forces a new frame from HA
  const snapshotUrl = appendCameraCacheBuster(baseSnapshotUrl, refreshKey);
  const mjpegStreamUrl = appendCameraCacheBuster(
    resolveCameraMjpegStreamUrl(baseSnapshotUrl),
    refreshKey
  );
  const resolvedGo2RtcConfig = useMemo(
    () =>
      resolveCameraGo2RtcConfig({
        entityId: id,
        defaults: cameraGo2RtcDefaults,
        override: go2RtcConfig,
        canUseEmbeddedPanel: hasGo2RtcCustomCard,
      }),
    [cameraGo2RtcDefaults, go2RtcConfig, hasGo2RtcCustomCard, id]
  );
  const hasGo2RtcFeed = resolvedGo2RtcConfig.hasFeed;

  const isUnavailable = liveEntity?.state === 'unavailable';
  const isRunning = liveEntity
    ? liveEntity.state !== 'off' && !isUnavailable
    : Boolean(snapshotUrl);
  const supportedFeatures =
    typeof liveAttrs?.supported_features === 'number'
      ? liveAttrs.supported_features
      : typeof liveAttrs?.supported_features === 'string'
        ? Number(liveAttrs.supported_features)
        : initialSupportedFeatures;
  const isStreamCapable =
    hasGo2RtcFeed ||
    frontendStreamTypes.length > 0 ||
    (typeof supportedFeatures === 'number' && Number.isFinite(supportedFeatures)
      ? (supportedFeatures & 2) === 2
      : (initialIsStreamCapable ?? false));
  const motionDetectionEnabled =
    typeof liveAttrs?.motion_detection_enabled === 'boolean'
      ? liveAttrs.motion_detection_enabled
      : null;
  const statusChangedAt =
    parseTimestamp(liveEntity?.last_changed) ?? parseTimestamp(liveEntity?.last_updated);
  const hasSnapshot = Boolean(snapshotUrl);
  const effectiveDashboardCameraViewMode = resolveDashboardCameraViewMode({
    cameraDashboardViewMode,
    hasCameraViewModeOverride,
    lowPowerMode,
    hasSnapshot,
    preferSnapshotPreview: runtime === 'standalone-oauth',
  });
  const failedStreamTypeSet = useMemo(() => new Set(failedStreamTypes), [failedStreamTypes]);
  const preferredTransport: PlatformCameraStreamType | 'auto' =
    cameraFeedMode === 'auto' || cameraFeedMode === 'hls' || cameraFeedMode === 'web_rtc'
      ? cameraFeedMode
      : 'auto';
  const presentation = usePlatformCameraPresentation({
    entityId: id,
    preferredMode: effectiveDashboardCameraViewMode,
    preferredTransport,
    snapshotUrl,
    mjpegStreamUrl,
    frontendStreamTypes,
    hasGo2RtcFeed,
    isUnavailable,
    isRunning,
    failedTransports: failedStreamTypeSet,
  });
  const imageSource: CameraImageSource = {
    url: presentation.sourceUrl,
    kind: presentation.sourceKind,
    isFallback: presentation.isFallback,
  };
  const refreshIntervalMs = getCameraAutoRefreshInterval({
    cameraViewMode: effectiveDashboardCameraViewMode,
    imageSourceKind: imageSource.kind,
    isFallback: imageSource.isFallback,
  });
  const liveStreamKind = presentation.videoStreamKind;
  const shouldRenderLiveStream = isVisible && liveStreamKind;
  const streamFailureResetKey = `${effectiveDashboardCameraViewMode}:${cameraFeedMode}:${resolvedGo2RtcConfig.source}:${resolvedGo2RtcConfig.serverUrl}:${resolvedGo2RtcConfig.streamName}:${frontendStreamTypes.join(',')}`;

  useEffect(() => {
    void streamFailureResetKey;
    setFailedStreamTypes([]);
  }, [streamFailureResetKey]);

  useEffect(() => {
    if (!isViewerOpen) {
      return;
    }

    setViewerCameraViewMode(
      resolveViewerInitialCameraViewMode({
        isStreamCapable,
        hasSnapshot,
      })
    );
  }, [hasSnapshot, isStreamCapable, isViewerOpen]);

  useEffect(() => {
    return () => {
      if (streamRetryTimeoutRef.current !== null) {
        window.clearTimeout(streamRetryTimeoutRef.current);
      }
    };
  }, []);

  useEffect(() => {
    setHasGo2RtcCustomCard(canUseGo2RtcCameraCard());
    if (typeof customElements === 'undefined' || customElements.get('webrtc-camera')) {
      return;
    }

    let isCancelled = false;
    void customElements
      .whenDefined('webrtc-camera')
      .then(() => {
        if (!isCancelled) {
          setHasGo2RtcCustomCard(canUseGo2RtcCameraCard());
        }
      })
      .catch(() => undefined);

    return () => {
      isCancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!refreshIntervalMs || !snapshotUrl || !isVisible || !isRunning || isUnavailable) {
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        setRefreshKey((k) => k + 1);
      }
    };
    const interval = window.setInterval(refreshIfVisible, refreshIntervalMs);

    return () => window.clearInterval(interval);
  }, [isRunning, isUnavailable, isVisible, refreshIntervalMs, snapshotUrl]);

  useEffect(() => {
    let isCancelled = false;
    let retryTimeoutId: number | null = null;
    let retryCount = 0;

    const loadCapabilities = () => {
      void integrationCameraFeatureService
        .getCameraCapabilities(id)
        .then((capabilities) => {
          if (!isCancelled) {
            setFrontendStreamTypes(readFrontendStreamTypes(capabilities));
          }
        })
        .catch(() => {
          if (isCancelled) {
            return;
          }

          setFrontendStreamTypes([]);
          if (retryCount >= CAMERA_CAPABILITIES_MAX_RETRIES) {
            return;
          }

          retryCount += 1;
          retryTimeoutId = window.setTimeout(loadCapabilities, CAMERA_CAPABILITIES_RETRY_DELAY_MS);
        });
    };

    if (!connected) {
      setFrontendStreamTypes([]);
      return;
    }

    loadCapabilities();

    return () => {
      isCancelled = true;
      if (retryTimeoutId !== null) {
        window.clearTimeout(retryTimeoutId);
      }
    };
  }, [connected, id]);

  // Subscribe to only entities belonging to this camera's device.
  // Re-renders only when one of those entities changes, not on unrelated HA updates.
  const deviceEntitySelector = useCallback(
    (state: IntegrationStore): Record<string, HassEntity | undefined> => {
      if (!deviceEntityIds.length || !state.entities) return EMPTY_DEVICE_RECORD;
      return Object.fromEntries(deviceEntityIds.map((eid) => [eid, state.entities?.[eid]]));
    },
    [deviceEntityIds]
  );
  const deviceEntities = useHomeAssistant(deviceEntitySelector, shallow);

  // Discover sibling entities from the same HA device (switches, selects, numbers)
  const siblingEntities = useMemo(() => {
    return deviceEntityIds
      .filter((eid) => {
        const domain = eid.split('.')[0];
        return domain === 'switch' || domain === 'select' || domain === 'number';
      })
      .map((eid) => {
        const entity = deviceEntities[eid];
        return entity ? { id: eid, entity } : null;
      })
      .filter((entry): entry is { id: string; entity: HassEntity } => entry !== null);
  }, [deviceEntityIds, deviceEntities]);

  const motionEntity = useMemo(() => {
    for (const eid of deviceEntityIds) {
      if (!eid.startsWith('binary_sensor.')) continue;
      const entity = deviceEntities[eid];
      if (entity && isMotionEntity(eid, entity)) {
        return { id: eid, entity };
      }
    }
    return null;
  }, [deviceEntityIds, deviceEntities]);

  const motionDetected =
    motionEntity?.entity?.state === 'on' ||
    motionEntity?.entity?.state === 'home' ||
    motionEntity?.entity?.state === 'detected';
  const motionChangedAt =
    parseTimestamp(motionEntity?.entity?.last_changed) ??
    parseTimestamp(motionEntity?.entity?.last_updated);

  const handleRefresh = useCallback(() => {
    setFailedStreamTypes([]);
    setRefreshKey((k) => k + 1);
  }, []);

  const handleCameraViewModeChange = useCallback(
    (mode: CameraViewMode) => {
      updateCameraViewMode(id, mode);
      setFailedStreamTypes([]);
      setRefreshKey((k) => k + 1);
    },
    [id, updateCameraViewMode]
  );

  const handleCameraFeedModeChange = useCallback(
    (mode: CameraFeedMode) => {
      updateCameraFeedMode(id, mode);
      setFailedStreamTypes([]);
      setRefreshKey((k) => k + 1);
    },
    [id, updateCameraFeedMode]
  );

  const handleGo2RtcConfigChange = useCallback(
    (config: CameraGo2RtcConfig) => {
      updateCameraGo2RtcConfig(id, config);
      setFailedStreamTypes([]);
      setRefreshKey((k) => k + 1);
    },
    [id, updateCameraGo2RtcConfig]
  );

  const handleGo2RtcDefaultsChange = useCallback(
    (defaults: CameraGo2RtcDefaults) => {
      updateCameraGo2RtcDefaults(defaults);
      setFailedStreamTypes([]);
      setRefreshKey((k) => k + 1);
    },
    [updateCameraGo2RtcDefaults]
  );

  const handleStreamError = useCallback(
    (kind: CameraImageSourceKind, options?: { retryable?: boolean }) => {
      setFailedStreamTypes((current) => (current.includes(kind) ? current : [...current, kind]));

      if (options?.retryable === false) {
        return;
      }

      if (streamRetryTimeoutRef.current !== null) {
        return;
      }

      streamRetryTimeoutRef.current = window.setTimeout(() => {
        streamRetryTimeoutRef.current = null;
        setFailedStreamTypes([]);
        setRefreshKey((k) => k + 1);
      }, CAMERA_STREAM_RETRY_DELAY_MS);
    },
    []
  );

  const handleToggleMotionDetection = useCallback(() => {
    if (motionDetectionEnabled === null) {
      return;
    }

    void (motionDetectionEnabled
      ? integrationCameraFeatureService.disableCameraMotionDetection(id)
      : integrationCameraFeatureService.enableCameraMotionDetection(id));
  }, [id, motionDetectionEnabled]);

  return (
    <>
      <CameraCardView
        id={id}
        name={name}
        room={room}
        cardRef={cardRef}
        imageUrl={imageSource.url}
        streamElement={
          shouldRenderLiveStream ? (
            <CameraStreamPlayer
              entityId={id}
              kind={shouldRenderLiveStream}
              posterUrl={snapshotUrl}
              go2RtcConfig={resolvedGo2RtcConfig}
              fitMode="cover"
              onError={handleStreamError}
            />
          ) : undefined
        }
        isUnavailable={isUnavailable}
        isRunning={isRunning}
        statusChangedAt={statusChangedAt}
        motionDetected={motionDetected}
        motionChangedAt={motionChangedAt}
        motionDetectionEnabled={motionDetectionEnabled}
        now={now}
        size={size}
        isEditMode={isEditMode}
        cameraViewMode={effectiveDashboardCameraViewMode}
        isStreamCapable={isStreamCapable}
        frontendStreamTypes={frontendStreamTypes}
        streamKind={imageSource.kind}
        isStreamFallback={imageSource.isFallback}
        onRefresh={handleRefresh}
        onImageError={() => handleStreamError(imageSource.kind)}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenViewer={() => setIsViewerOpen(true)}
        onToggleMotionDetection={handleToggleMotionDetection}
      />

      {isViewerOpen && (
        <CameraLiveViewer
          isOpen={isViewerOpen}
          onOpenChange={setIsViewerOpen}
          entityId={id}
          name={name}
          room={room}
          snapshotUrl={snapshotUrl}
          mjpegStreamUrl={mjpegStreamUrl}
          cameraViewMode={viewerCameraViewMode}
          cameraFeedMode={cameraFeedMode}
          go2RtcConfig={resolvedGo2RtcConfig}
          isUnavailable={isUnavailable}
          isRunning={isRunning}
          isStreamCapable={isStreamCapable}
          frontendStreamTypes={frontendStreamTypes}
          hasGo2RtcFeed={hasGo2RtcFeed}
          onRefresh={handleRefresh}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCameraViewModeChange={setViewerCameraViewMode}
        />
      )}

      {isSettingsOpen && (
        <CameraSettingsDialog
          entityId={id}
          name={name}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          siblingEntities={siblingEntities}
          cameraViewMode={cameraDashboardViewMode}
          cameraFeedMode={cameraFeedMode}
          go2RtcConfig={go2RtcConfig}
          go2RtcDefaults={cameraGo2RtcDefaults}
          resolvedGo2RtcConfig={resolvedGo2RtcConfig}
          frontendStreamTypes={frontendStreamTypes}
          hasGo2RtcFeed={hasGo2RtcFeed}
          hasMjpegStream={Boolean(mjpegStreamUrl)}
          hasSnapshot={hasSnapshot}
          lowPowerMode={lowPowerMode}
          onCameraViewModeChange={handleCameraViewModeChange}
          onCameraFeedModeChange={handleCameraFeedModeChange}
          onGo2RtcDefaultsChange={handleGo2RtcDefaultsChange}
          onGo2RtcConfigChange={handleGo2RtcConfigChange}
        />
      )}
    </>
  );
});
