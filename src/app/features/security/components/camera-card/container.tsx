import { memo, useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/app/contexts/auth-context';
import { useHomeAssistant } from '@/app/hooks';
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
  const entityRegistry = useHomeAssistant(homeAssistantSelectors.entityRegistry);
  const allEntities = useHomeAssistant(homeAssistantSelectors.entities);
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

  const deviceId = useMemo(
    () => entityRegistry.find((entry) => entry.entity_id === id)?.device_id ?? null,
    [entityRegistry, id]
  );

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setNow(Date.now());
    }, 30_000);

    return () => window.clearInterval(intervalId);
  }, []);

  // Discover sibling entities from the same HA device (switches, selects, numbers)
  const siblingEntities = useMemo(() => {
    if (!deviceId || !allEntities) return [];

    return entityRegistry
      .filter((e) => {
        if (e.device_id !== deviceId || e.entity_id === id) return false;
        const domain = e.entity_id.split('.')[0];
        return domain === 'switch' || domain === 'select' || domain === 'number';
      })
      .map((e) => ({ id: e.entity_id, entity: allEntities[e.entity_id] }))
      .filter((e) => e.entity !== undefined) as {
      id: string;
      entity: NonNullable<typeof allEntities>[string];
    }[];
  }, [allEntities, deviceId, entityRegistry, id]);

  const motionEntity = useMemo(() => {
    if (!deviceId || !allEntities) {
      return null;
    }

    return (
      entityRegistry
        .filter((entry) => {
          if (entry.device_id !== deviceId || entry.entity_id === id) {
            return false;
          }

          if (!entry.entity_id.startsWith('binary_sensor.')) {
            return false;
          }

          return isMotionEntity(entry.entity_id, allEntities[entry.entity_id]);
        })
        .map((entry) => ({ id: entry.entity_id, entity: allEntities[entry.entity_id] }))
        .find((entry) => entry.entity !== undefined) ?? null
    );
  }, [allEntities, deviceId, entityRegistry, id]);

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
          room={room}
          isOpen={isSettingsOpen}
          onOpenChange={setIsSettingsOpen}
          siblingEntities={siblingEntities}
        />
      )}
    </>
  );
});
