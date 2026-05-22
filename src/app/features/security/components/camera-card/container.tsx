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
import { useCameraRegistryDeviceTopology, useHomeAssistant } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { useAuth } from '@/app/stores/auth-store';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { authSelectors, homeAssistantSelectors, settingsSelectors } from '@/app/stores/selectors';
import {
  type CameraFeedMode,
  type CameraViewMode,
  useSettingsStore,
} from '@/app/stores/settings-store';
import { CameraLiveViewer } from './camera-live-viewer';
import { CameraSettingsDialog } from './camera-settings-dialog';
import { CameraStreamPlayer } from './camera-stream-player';
import {
  appendCameraCacheBuster,
  type CameraImageSourceKind,
  type CameraStreamType,
  getCameraAutoRefreshInterval,
  readCameraStreamTypes,
  resolveCameraMjpegStreamUrl,
  selectCameraImageSource,
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

function resolveHomeAssistantImageUrl(
  imageUrl: string | undefined,
  homeAssistantUrl: string | undefined
) {
  if (!imageUrl) {
    return undefined;
  }

  return imageUrl.startsWith('/') && homeAssistantUrl ? `${homeAssistantUrl}${imageUrl}` : imageUrl;
}

function readFrontendStreamTypes(value: unknown) {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const raw = (value as { frontend_stream_types?: unknown }).frontend_stream_types;
  return readCameraStreamTypes(raw);
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
  const config = useAuth(authSelectors.config);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const cameraViewMode = useSettingsStore(settingsSelectors.cameraViewModeForEntity(id));
  const cameraFeedMode = useSettingsStore(settingsSelectors.cameraFeedModeForEntity(id));
  const updateCameraViewMode = useSettingsStore(settingsSelectors.updateCameraViewMode);
  const updateCameraFeedMode = useSettingsStore(settingsSelectors.updateCameraFeedMode);
  const { siblingIds: deviceEntityIds } = useCameraRegistryDeviceTopology(id);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [failedStreamTypes, setFailedStreamTypes] = useState<CameraImageSourceKind[]>([]);
  const [frontendStreamTypes, setFrontendStreamTypes] = useState<CameraStreamType[]>([]);
  const streamRetryTimeoutRef = useRef<number | null>(null);
  const { cardRef, isVisible } = useCameraCardVisibility();
  const now = useCameraClock();

  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const liveEntityPicture =
    readImageUrl(liveAttrs?.entity_picture) ?? readImageUrl(liveAttrs?.entity_picture_local);
  const initialSnapshotUrl = readImageUrl(initialEntityPicture);
  const baseSnapshotUrl = liveEntityPicture
    ? resolveHomeAssistantImageUrl(liveEntityPicture, config?.url)
    : initialSnapshotUrl;

  // Append cache-busting param so refresh forces a new frame from HA
  const snapshotUrl = appendCameraCacheBuster(baseSnapshotUrl, refreshKey);
  const mjpegStreamUrl = appendCameraCacheBuster(
    resolveCameraMjpegStreamUrl(baseSnapshotUrl),
    refreshKey
  );

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
  const failedStreamTypeSet = useMemo(() => new Set(failedStreamTypes), [failedStreamTypes]);
  const imageSource = selectCameraImageSource({
    cameraViewMode,
    cameraFeedMode,
    snapshotUrl,
    mjpegStreamUrl,
    frontendStreamTypes,
    isUnavailable,
    isRunning,
    failedStreamTypes: failedStreamTypeSet,
  });
  const refreshIntervalMs = getCameraAutoRefreshInterval({
    cameraViewMode,
    imageSourceKind: imageSource.kind,
    isFallback: imageSource.isFallback,
  });
  const liveStreamKind =
    imageSource.kind === 'hls' || imageSource.kind === 'web_rtc' ? imageSource.kind : null;
  const shouldRenderLiveStream = isVisible && liveStreamKind;
  const streamFailureResetKey = `${cameraViewMode}:${cameraFeedMode}:${frontendStreamTypes.join(',')}`;

  useEffect(() => {
    void streamFailureResetKey;
    setFailedStreamTypes([]);
  }, [streamFailureResetKey]);

  useEffect(() => {
    return () => {
      if (streamRetryTimeoutRef.current !== null) {
        window.clearTimeout(streamRetryTimeoutRef.current);
      }
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
      void homeAssistantService
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
    (state: HomeAssistantStore): Record<string, HassEntity | undefined> => {
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

  const handleStreamError = useCallback((kind: CameraImageSourceKind) => {
    setFailedStreamTypes((current) => (current.includes(kind) ? current : [...current, kind]));

    if (streamRetryTimeoutRef.current !== null) {
      return;
    }

    streamRetryTimeoutRef.current = window.setTimeout(() => {
      streamRetryTimeoutRef.current = null;
      setFailedStreamTypes([]);
      setRefreshKey((k) => k + 1);
    }, CAMERA_STREAM_RETRY_DELAY_MS);
  }, []);

  const handleToggleMotionDetection = useCallback(() => {
    if (motionDetectionEnabled === null) {
      return;
    }

    void (motionDetectionEnabled
      ? homeAssistantService.disableCameraMotionDetection(id)
      : homeAssistantService.enableCameraMotionDetection(id));
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
              homeAssistantUrl={config?.url}
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
        cameraViewMode={cameraViewMode}
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
          cameraViewMode={cameraViewMode}
          cameraFeedMode={cameraFeedMode}
          isUnavailable={isUnavailable}
          isRunning={isRunning}
          isStreamCapable={isStreamCapable}
          frontendStreamTypes={frontendStreamTypes}
          homeAssistantUrl={config?.url}
          onRefresh={handleRefresh}
          onOpenSettings={() => setIsSettingsOpen(true)}
          onCameraViewModeChange={handleCameraViewModeChange}
        />
      )}

      {isSettingsOpen && (
        <CameraSettingsDialog
          entityId={id}
          name={name}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          siblingEntities={siblingEntities}
          cameraViewMode={cameraViewMode}
          cameraFeedMode={cameraFeedMode}
          frontendStreamTypes={frontendStreamTypes}
          hasMjpegStream={Boolean(mjpegStreamUrl)}
          hasSnapshot={Boolean(snapshotUrl)}
          onCameraViewModeChange={handleCameraViewModeChange}
          onCameraFeedModeChange={handleCameraFeedModeChange}
        />
      )}
    </>
  );
});
