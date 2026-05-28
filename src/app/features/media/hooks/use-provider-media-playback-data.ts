import { useCallback, useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { useHomeAssistant } from '@/app/hooks';
import { useProviderDevice } from '@/app/hooks/use-provider-device';
import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@/app/platform/provider-feature-models';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { resolveHomeAssistantEntityId } from '@/app/utils/provider-entity-id';

export interface ProviderMediaPlaybackData {
  entities: PlatformEntitySnapshotMap | null;
  entityRegistry: PlatformEntityRegistryEntry[];
}

const EMPTY_MEDIA_PLAYBACK_DATA: ProviderMediaPlaybackData = {
  entities: null,
  entityRegistry: [],
};

function selectEmptyMediaPlaybackData() {
  return EMPTY_MEDIA_PLAYBACK_DATA;
}

function selectUndefinedEntity() {
  return undefined;
}

function selectEmptyEntityRegistry(): PlatformEntityRegistryEntry[] {
  return [];
}

function selectEmptyMediaPlayerEntities() {
  return null;
}

function toPlatformEntitySnapshot(
  entityId: string,
  entity: {
    state: string;
    attributes?: Record<string, unknown>;
    last_changed?: string;
    last_updated?: string;
  }
): PlatformEntitySnapshot {
  return {
    entityId,
    state: entity.state,
    attributes: (entity.attributes as Record<string, unknown> | undefined) ?? {},
    lastChanged: entity.last_changed,
    lastUpdated: entity.last_updated,
  };
}

function toPlatformEntityRegistryEntry(entry: {
  entity_id?: string;
  entityId?: string;
  device_id?: string | null;
  deviceId?: string | null;
  area_id?: string | null;
  areaId?: string | null;
  name?: string | null;
  platform?: string | null;
}): PlatformEntityRegistryEntry {
  return {
    entityId: entry.entity_id ?? entry.entityId ?? '',
    deviceId: entry.device_id ?? entry.deviceId ?? null,
    areaId: entry.area_id ?? entry.areaId ?? null,
    name: entry.name ?? null,
    platform: entry.platform ?? null,
  };
}

function selectMediaPlaybackData(state: HomeAssistantStore): ProviderMediaPlaybackData {
  return {
    entities: state.entities
      ? Object.fromEntries(
          Object.entries(state.entities).map(([entityId, entity]) => [
            entityId,
            toPlatformEntitySnapshot(entityId, entity),
          ])
        )
      : null,
    entityRegistry: state.entityRegistry.map(toPlatformEntityRegistryEntry),
  };
}

function selectMediaPlayerEntities(state: HomeAssistantStore) {
  if (!state.entities) {
    return null;
  }

  return Object.fromEntries(
    Object.entries(state.entities)
      .filter(([entityId]) => entityId.startsWith('media_player.'))
      .map(([entityId, entity]) => [entityId, toPlatformEntitySnapshot(entityId, entity)])
  );
}

function useResolvedHomeAssistantMediaEntityId(entityId: string): string | null {
  const providerDevice = useProviderDevice(entityId);

  return useMemo(
    () => resolveHomeAssistantEntityId(entityId, providerDevice?.providerId),
    [entityId, providerDevice?.providerId]
  );
}

export function useProviderMediaPlaybackData(entityId: string): ProviderMediaPlaybackData {
  const homeAssistantEntityId = useResolvedHomeAssistantMediaEntityId(entityId);

  return useHomeAssistant(
    homeAssistantEntityId ? selectMediaPlaybackData : selectEmptyMediaPlaybackData
  );
}

export function useProviderMediaEntity(entityId: string): PlatformEntitySnapshot | undefined {
  const homeAssistantEntityId = useResolvedHomeAssistantMediaEntityId(entityId);

  return useHomeAssistant(
    homeAssistantEntityId
      ? (state) => {
          const entity = homeAssistantSelectors.entity(homeAssistantEntityId)(state);
          return entity ? toPlatformEntitySnapshot(homeAssistantEntityId, entity) : undefined;
        }
      : selectUndefinedEntity
  );
}

export function useProviderMediaCompanionEntity(
  entityId: string,
  companionDomain: string
): PlatformEntitySnapshot | undefined {
  const homeAssistantEntityId = useResolvedHomeAssistantMediaEntityId(entityId);
  const companionEntityId = useMemo(() => {
    if (!homeAssistantEntityId) {
      return null;
    }

    const objectId = homeAssistantEntityId.split('.').slice(1).join('.');
    return objectId ? `${companionDomain}.${objectId}` : null;
  }, [companionDomain, homeAssistantEntityId]);

  return useHomeAssistant(
    companionEntityId
      ? (state) => {
          const entity = homeAssistantSelectors.entity(companionEntityId)(state);
          return entity ? toPlatformEntitySnapshot(companionEntityId, entity) : undefined;
        }
      : selectUndefinedEntity
  );
}

export function useProviderMediaEntityRegistry(entityId: string): PlatformEntityRegistryEntry[] {
  const homeAssistantEntityId = useResolvedHomeAssistantMediaEntityId(entityId);

  return useHomeAssistant(
    homeAssistantEntityId
      ? (state) => state.entityRegistry.map(toPlatformEntityRegistryEntry)
      : selectEmptyEntityRegistry
  );
}

export function useProviderMediaPlayerEntities(
  entityId: string,
  enabled: boolean
): PlatformEntitySnapshotMap | null {
  const homeAssistantEntityId = useResolvedHomeAssistantMediaEntityId(entityId);
  const selector = useCallback(
    (state: HomeAssistantStore) =>
      homeAssistantEntityId && enabled ? selectMediaPlayerEntities(state) : null,
    [enabled, homeAssistantEntityId]
  );

  return useHomeAssistant(
    homeAssistantEntityId && enabled ? selector : selectEmptyMediaPlayerEntities,
    shallow
  );
}
