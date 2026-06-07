import { useEditModeSettingsRequest } from '@navet/app/components/shared/edit-mode-settings-request';
import { readNavetCameraState } from '@navet/app/core/navet-device-state';
import { useCameraPlaybackPlan } from '@navet/app/features/security/hooks/use-camera-playback-plan';
import { useProviderCameraTopology } from '@navet/app/hooks';
import { useProviderEntityModel } from '@navet/app/hooks/use-provider-device';
import type {
  PlatformCameraTransport,
  PlatformEntitySnapshot,
} from '@navet/app/platform/provider-feature-models';
import { integrationCameraFeatureService } from '@navet/app/services/integration-camera-feature.service';
import { normalizeResourceUrl } from '@navet/app/services/integration-resource.service';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { type CameraViewMode, useSettingsStore } from '@navet/app/stores/settings-store';
import {
  memo,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useSyncExternalStore,
} from 'react';
import { CameraLiveViewer } from './camera-live-viewer';
import { CameraSettingsDialog } from './camera-settings-dialog';
import { CameraStreamPlayer } from './camera-stream-player';
import {
  appendCameraCacheBuster,
  normalizeCameraSnapshotUrl,
  resolveDashboardCameraViewMode,
  resolveViewerInitialCameraViewMode,
} from './camera-view-mode';
import type { CameraCardProps } from './types';
import { useProviderCameraLiveData } from './use-provider-camera-live-data';
import { CameraCardView } from './view';

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

  return normalizeResourceUrl(imageUrl, 'home_assistant') ?? imageUrl;
}

const CAMERA_CLOCK_INTERVAL_MS = 30_000;
const CAMERA_STREAM_RETRY_DELAY_MS = 5_000;
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

function useCameraClock(enabled: boolean) {
  return useSyncExternalStore(
    enabled ? subscribeToCameraClock : () => () => {},
    getCameraClockSnapshot,
    getCameraClockSnapshot
  );
}

function useCameraCardVisibility() {
  const cardRef = useRef<HTMLDivElement>(null);
  const [isVisible, setIsVisible] = useState(false);

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
  entityPictureSources: initialEntityPictureSources,
  isStreamCapable: initialIsStreamCapable,
  size,
  isEditMode,
}: CameraCardProps) {
  const providerEntity = useProviderEntityModel(id);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const cameraDashboardViewMode = useSettingsStore(
    settingsSelectors.cameraDashboardViewModeForEntity(id)
  );
  const cameraStreamPreference = useSettingsStore(
    settingsSelectors.cameraStreamPreferenceForEntity(id)
  );
  const cameraFitMode = useSettingsStore(settingsSelectors.cameraFitModeForEntity(id));
  const updateCameraViewMode = useSettingsStore(settingsSelectors.updateCameraViewMode);
  const updateCameraStreamPreference = useSettingsStore(
    settingsSelectors.updateCameraStreamPreference
  );
  const updateCameraFitMode = useSettingsStore(settingsSelectors.updateCameraFitMode);
  const { siblingIds: deviceEntityIds } = useProviderCameraTopology(id);
  const { cameraState, companionStates, deviceEntities, liveEntity, liveState } =
    useProviderCameraLiveData(id, deviceEntityIds);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [viewerCameraViewMode, setViewerCameraViewMode] = useState<CameraViewMode>('live');
  const [failedStreamTypes, setFailedStreamTypes] = useState<PlatformCameraTransport[]>([]);
  const streamRetryTimeoutRef = useRef<number | null>(null);
  const { cardRef, isVisible } = useCameraCardVisibility();
  const now = useCameraClock(isVisible || isViewerOpen);

  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const providerState = readNavetCameraState(providerEntity);
  const liveEntityPicture =
    readImageUrl(liveAttrs?.entity_picture_local) ?? readImageUrl(liveAttrs?.entity_picture);
  const initialSnapshotUrl =
    readImageUrl(initialEntityPicture) ??
    readImageUrl(
      typeof providerState?.entityPicture === 'string' ? providerState.entityPicture : undefined
    );
  const baseSnapshotUrl = normalizeCameraSnapshotUrl(
    liveEntityPicture ? resolveHomeAssistantImageUrl(liveEntityPicture) : initialSnapshotUrl
  );
  const imageSources = liveEntityPicture ? undefined : initialEntityPictureSources;
  const snapshotUrl = appendCameraCacheBuster(baseSnapshotUrl, refreshKey);
  const hasSnapshot = Boolean(snapshotUrl);
  const isStreamCapable =
    liveState.isStreamCapable ||
    providerState?.isStreamCapable === true ||
    (initialIsStreamCapable ?? false);
  const effectiveDashboardCameraViewMode = resolveDashboardCameraViewMode({
    cameraDashboardViewMode,
    lowPowerMode,
    hasSnapshot,
  });
  const playbackOptionsModel = useCameraPlaybackPlan({
    entityId: id,
    cameraState,
    preferredMode: 'live',
    preferredTransport: 'auto',
    snapshotUrl,
    isStreamCapable,
    motionDetectionEnabled: liveState.motionDetectionEnabled,
    failedTransports: new Set(),
  });
  const effectiveCameraStreamPreference =
    cameraStreamPreference === 'auto' ||
    (playbackOptionsModel?.liveTransports ?? []).includes(cameraStreamPreference)
      ? cameraStreamPreference
      : 'auto';
  const playbackModel = useCameraPlaybackPlan({
    entityId: id,
    cameraState,
    preferredMode: effectiveDashboardCameraViewMode,
    preferredTransport: effectiveCameraStreamPreference,
    snapshotUrl,
    isStreamCapable,
    motionDetectionEnabled: liveState.motionDetectionEnabled,
    failedTransports: new Set(failedStreamTypes),
  });

  useEditModeSettingsRequest(id, () => setIsSettingsOpen(true), isEditMode);

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
    if (isVisible) {
      return;
    }

    if (streamRetryTimeoutRef.current !== null) {
      window.clearTimeout(streamRetryTimeoutRef.current);
      streamRetryTimeoutRef.current = null;
    }
  }, [isVisible]);

  useEffect(() => {
    setFailedStreamTypes([]);
  }, [effectiveCameraStreamPreference, effectiveDashboardCameraViewMode, id]);

  useEffect(() => {
    const refreshIntervalMs = playbackModel?.refreshPolicy.snapshotRefreshMs ?? null;
    if (
      !refreshIntervalMs ||
      !snapshotUrl ||
      !isVisible ||
      cameraState === 'unavailable' ||
      playbackModel?.selectedTransport
    ) {
      return;
    }

    const refreshIfVisible = () => {
      if (document.visibilityState === 'visible') {
        setRefreshKey((key) => key + 1);
      }
    };
    const interval = window.setInterval(refreshIfVisible, refreshIntervalMs);

    return () => window.clearInterval(interval);
  }, [
    cameraState,
    isVisible,
    playbackModel?.refreshPolicy.snapshotRefreshMs,
    playbackModel?.selectedTransport,
    snapshotUrl,
  ]);

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
      .filter((entry): entry is { id: string; entity: PlatformEntitySnapshot } => entry !== null);
  }, [deviceEntities, deviceEntityIds]);

  const motionState = companionStates.find((state) => state.type === 'motion') ?? null;
  const motionDetected = motionState?.detected ?? false;
  const motionChangedAt = parseTimestamp(motionState?.changedAt);
  const statusChangedAt =
    parseTimestamp(liveEntity?.lastChanged) ?? parseTimestamp(liveEntity?.lastUpdated);

  const handleRefresh = useCallback(() => {
    setFailedStreamTypes([]);
    setRefreshKey((key) => key + 1);

    void integrationCameraFeatureService
      .refreshCameraSnapshot?.(id)
      .catch(() => undefined)
      .finally(() => {
        setRefreshKey((key) => key + 1);
      });
  }, [id]);

  const handleCameraViewModeChange = useCallback(
    (mode: CameraViewMode) => {
      updateCameraViewMode(id, mode);
      setFailedStreamTypes([]);
      setRefreshKey((key) => key + 1);
    },
    [id, updateCameraViewMode]
  );

  const handleCameraStreamPreferenceChange = useCallback(
    (preference: 'auto' | PlatformCameraTransport) => {
      updateCameraStreamPreference(id, preference);
      setFailedStreamTypes([]);
      setRefreshKey((key) => key + 1);
    },
    [id, updateCameraStreamPreference]
  );

  const handleCameraFitModeChange = useCallback(
    (mode: 'cover' | 'contain') => {
      updateCameraFitMode(id, mode);
    },
    [id, updateCameraFitMode]
  );

  const handleStreamError = useCallback(
    (kind: 'hls' | 'web_rtc' | 'mjpeg' | 'snapshot', options?: { retryable?: boolean }) => {
      if (kind === 'snapshot') {
        return;
      }

      setFailedStreamTypes((current) => (current.includes(kind) ? current : [...current, kind]));

      if (options?.retryable === false || hasSnapshot) {
        return;
      }

      if (streamRetryTimeoutRef.current !== null) {
        return;
      }

      if (!isVisible || document.visibilityState !== 'visible') {
        return;
      }

      streamRetryTimeoutRef.current = window.setTimeout(() => {
        streamRetryTimeoutRef.current = null;
        setFailedStreamTypes([]);
        setRefreshKey((key) => key + 1);
      }, CAMERA_STREAM_RETRY_DELAY_MS);
    },
    [hasSnapshot, isVisible]
  );

  const handleToggleMotionDetection = useCallback(() => {
    const motionDetectionEnabled =
      playbackModel?.motionDetectionEnabled ?? liveState.motionDetectionEnabled;
    if (motionDetectionEnabled === null) {
      return;
    }

    void (motionDetectionEnabled
      ? integrationCameraFeatureService.disableCameraMotionDetection(id)
      : integrationCameraFeatureService.enableCameraMotionDetection(id));
  }, [id, liveState.motionDetectionEnabled, playbackModel?.motionDetectionEnabled]);

  const imageUrl = playbackModel?.snapshotResource?.url ?? snapshotUrl;
  const streamKind = playbackModel?.selectedTransport ?? 'snapshot';
  // Keep live streams mounted on the card even if intersection callbacks flap during layout churn.
  const shouldRenderLiveStream = playbackModel?.selectedTransport ?? null;
  const streamElement = useMemo(() => {
    if (!shouldRenderLiveStream) {
      return undefined;
    }

    return (
      <CameraStreamPlayer
        entityId={id}
        kind={shouldRenderLiveStream}
        posterUrl={imageUrl}
        streamResource={playbackModel?.selectedStreamResource ?? null}
        fitMode={cameraFitMode}
        onError={handleStreamError}
      />
    );
  }, [
    cameraFitMode,
    handleStreamError,
    id,
    imageUrl,
    playbackModel?.selectedStreamResource,
    shouldRenderLiveStream,
  ]);

  return (
    <>
      <CameraCardView
        id={id}
        name={name}
        room={room}
        cardRef={cardRef}
        imageUrl={imageUrl}
        imageSources={imageSources}
        streamElement={streamElement}
        cameraState={cameraState}
        statusChangedAt={statusChangedAt}
        motionDetected={motionDetected}
        motionChangedAt={motionChangedAt}
        motionDetectionEnabled={
          playbackModel?.motionDetectionEnabled ?? liveState.motionDetectionEnabled
        }
        now={now}
        size={size}
        isEditMode={isEditMode}
        cameraViewMode={effectiveDashboardCameraViewMode}
        fitMode={cameraFitMode}
        isStreamCapable={playbackModel?.supportsStreaming ?? isStreamCapable}
        frontendStreamTypes={playbackModel?.liveTransports ?? []}
        streamKind={streamKind}
        isStreamFallback={playbackModel?.isSnapshotFallback ?? false}
        onRefresh={handleRefresh}
        onImageError={() => undefined}
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
          cameraState={cameraState}
          snapshotUrl={snapshotUrl}
          snapshotSources={imageSources}
          cameraViewMode={viewerCameraViewMode}
          preferredTransport={cameraStreamPreference}
          isStreamCapable={isStreamCapable}
          motionDetectionEnabled={
            playbackModel?.motionDetectionEnabled ?? liveState.motionDetectionEnabled
          }
          initialStreamResource={playbackModel?.selectedStreamResource ?? null}
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
          cameraStreamPreference={effectiveCameraStreamPreference}
          supportedStreamPreferences={playbackOptionsModel?.liveTransports ?? []}
          supportsStreaming={isStreamCapable}
          hasSnapshot={hasSnapshot}
          lowPowerMode={lowPowerMode}
          cameraFitMode={cameraFitMode}
          onCameraViewModeChange={handleCameraViewModeChange}
          onCameraStreamPreferenceChange={handleCameraStreamPreferenceChange}
          onCameraFitModeChange={handleCameraFitModeChange}
        />
      )}
    </>
  );
});
