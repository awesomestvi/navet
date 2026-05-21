import type { HassEntity } from 'home-assistant-js-websocket';
import { memo, useCallback, useEffect, useMemo, useState, useSyncExternalStore } from 'react';
import { shallow } from 'zustand/shallow';
import { useCameraRegistryDeviceTopology, useHomeAssistant } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { useAuth } from '@/app/stores/auth-store';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { authSelectors, homeAssistantSelectors } from '@/app/stores/selectors';
import { CameraLiveViewer } from './camera-live-viewer';
import { CameraSettingsDialog } from './camera-settings-dialog';
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

function resolveCameraStreamPreviewUrl(snapshotUrl: string | undefined) {
  if (!snapshotUrl?.includes('/api/camera_proxy/')) {
    return undefined;
  }

  return snapshotUrl.replace('/api/camera_proxy/', '/api/camera_proxy_stream/');
}

function readFrontendStreamTypes(value: unknown): string[] {
  if (!value || typeof value !== 'object') {
    return [];
  }

  const raw = (value as { frontend_stream_types?: unknown }).frontend_stream_types;
  return Array.isArray(raw) ? raw.filter((item): item is string => typeof item === 'string') : [];
}

const EMPTY_DEVICE_RECORD: Record<string, HassEntity | undefined> = {};
const CAMERA_CLOCK_INTERVAL_MS = 30_000;
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
  const { siblingIds: deviceEntityIds } = useCameraRegistryDeviceTopology(id);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isViewerOpen, setIsViewerOpen] = useState(false);
  const [frontendStreamTypes, setFrontendStreamTypes] = useState<string[]>([]);
  const now = useCameraClock();

  const liveAttrs = liveEntity?.attributes as Record<string, unknown> | undefined;
  const liveEntityPicture =
    readImageUrl(liveAttrs?.entity_picture) ?? readImageUrl(liveAttrs?.entity_picture_local);
  const initialSnapshotUrl = readImageUrl(initialEntityPicture);
  const baseSnapshotUrl = liveEntityPicture
    ? resolveHomeAssistantImageUrl(liveEntityPicture, config?.url)
    : initialSnapshotUrl;

  // Append cache-busting param so refresh forces a new frame from HA
  const snapshotUrl = baseSnapshotUrl
    ? `${baseSnapshotUrl}${baseSnapshotUrl.includes('?') ? '&' : '?'}_t=${refreshKey}`
    : undefined;
  const streamPreviewUrl = resolveCameraStreamPreviewUrl(snapshotUrl);

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

  useEffect(() => {
    let isCancelled = false;

    if (!connected) {
      setFrontendStreamTypes([]);
      return;
    }

    void homeAssistantService
      .getCameraCapabilities(id)
      .then((capabilities) => {
        if (!isCancelled) {
          setFrontendStreamTypes(readFrontendStreamTypes(capabilities));
        }
      })
      .catch(() => {
        if (!isCancelled) {
          setFrontendStreamTypes([]);
        }
      });

    return () => {
      isCancelled = true;
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
    setRefreshKey((k) => k + 1);
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
        snapshotUrl={snapshotUrl}
        isUnavailable={isUnavailable}
        isRunning={isRunning}
        statusChangedAt={statusChangedAt}
        motionDetected={motionDetected}
        motionChangedAt={motionChangedAt}
        motionDetectionEnabled={motionDetectionEnabled}
        now={now}
        size={size}
        isEditMode={isEditMode}
        isStreamCapable={isStreamCapable}
        frontendStreamTypes={frontendStreamTypes}
        onRefresh={handleRefresh}
        onOpenSettings={() => setIsSettingsOpen(true)}
        onOpenViewer={() => setIsViewerOpen(true)}
        onToggleMotionDetection={handleToggleMotionDetection}
      />

      {isViewerOpen && (
        <CameraLiveViewer
          isOpen={isViewerOpen}
          onOpenChange={setIsViewerOpen}
          name={name}
          room={room}
          snapshotUrl={snapshotUrl}
          streamPreviewUrl={isStreamCapable ? streamPreviewUrl : undefined}
          isUnavailable={isUnavailable}
          isRunning={isRunning}
          isStreamCapable={isStreamCapable}
          frontendStreamTypes={frontendStreamTypes}
          onRefresh={handleRefresh}
          onOpenSettings={() => setIsSettingsOpen(true)}
        />
      )}

      {isSettingsOpen && (
        <CameraSettingsDialog
          entityId={id}
          name={name}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          siblingEntities={siblingEntities}
        />
      )}
    </>
  );
});
