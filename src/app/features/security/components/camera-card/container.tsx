import type { HassEntity } from 'home-assistant-js-websocket';
import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { shallow } from 'zustand/shallow';
import { useCameraRegistryDeviceTopology, useHomeAssistant } from '@/app/hooks';
import { useAuth } from '@/app/stores/auth-store';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { authSelectors, homeAssistantSelectors } from '@/app/stores/selectors';
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

const EMPTY_DEVICE_RECORD: Record<string, HassEntity | undefined> = {};

export const CameraCardContainer = memo(function CameraCardContainer({
  id,
  name,
  room,
  entityPicture: initialEntityPicture,
  size,
  isEditMode,
}: CameraCardProps) {
  const config = useAuth(authSelectors.config);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const { siblingIds: deviceEntityIds } = useCameraRegistryDeviceTopology(id);
  const [refreshKey, setRefreshKey] = useState(0);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [now, setNow] = useState(() => Date.now());

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

  const isUnavailable = liveEntity?.state === 'unavailable';
  const isRunning = liveEntity
    ? liveEntity.state !== 'off' && !isUnavailable
    : Boolean(snapshotUrl);
  const statusChangedAt =
    parseTimestamp(liveEntity?.last_changed) ?? parseTimestamp(liveEntity?.last_updated);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

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
        now={now}
        size={size}
        isEditMode={isEditMode}
        onRefresh={handleRefresh}
        onOpenSettings={() => setIsSettingsOpen(true)}
      />

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
