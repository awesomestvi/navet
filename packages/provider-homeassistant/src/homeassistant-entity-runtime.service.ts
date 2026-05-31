import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshotMap,
} from '@navet/core/provider-feature-models';
import type { ProviderEntityRuntimeService } from '@navet/core/provider-feature-services';
import { areDataEqual } from '@navet/core/structural-equality';
import type { HassConfig, HassEntities } from 'home-assistant-js-websocket';
import {
  addHomeAssistantListener,
  getHomeAssistantConfig,
  getHomeAssistantEntities,
  getHomeAssistantEntityRegistry,
  getHomeAssistantStoreState,
  type HomeAssistantEntityRegistryEntry,
} from './homeassistant-service-bridge';

const EMPTY_HASS_ENTITY_REGISTRY: HomeAssistantEntityRegistryEntry[] = [];
let cachedSourceEntities: HassEntities | null | undefined;
let cachedPlatformEntities: PlatformEntitySnapshotMap | null = null;
let cachedSourceRegistry: HomeAssistantEntityRegistryEntry[] | null = null;
let cachedPlatformRegistry: PlatformEntityRegistryEntry[] = [];
let cachedSourceConfig: HassConfig | null = null;
let cachedPlatformConfig: HassConfig | null = null;

function areEquivalentEntitySnapshots(
  previous: HassEntities | null | undefined,
  next: HassEntities | null | undefined
) {
  if (previous === next) {
    return true;
  }

  if (!previous || !next) {
    return false;
  }

  const previousEntries = Object.entries(previous);
  const nextEntries = Object.entries(next);
  if (previousEntries.length !== nextEntries.length) {
    return false;
  }

  for (const [entityId, entity] of previousEntries) {
    const nextEntity = next[entityId];
    if (!nextEntity) {
      return false;
    }

    if (
      entity.state !== nextEntity.state ||
      entity.last_changed !== nextEntity.last_changed ||
      entity.last_updated !== nextEntity.last_updated ||
      !areDataEqual(entity.attributes ?? {}, nextEntity.attributes ?? {})
    ) {
      return false;
    }
  }

  return true;
}

function areEquivalentRegistryEntries(
  previous: HomeAssistantEntityRegistryEntry[] | null,
  next: HomeAssistantEntityRegistryEntry[]
) {
  if (previous === next) {
    return true;
  }

  if (!previous || previous.length !== next.length) {
    return false;
  }

  return previous.every((entry, index) => {
    const nextEntry = next[index];
    return (
      entry.entity_id === nextEntry.entity_id &&
      entry.device_id === nextEntry.device_id &&
      entry.area_id === nextEntry.area_id &&
      entry.name === nextEntry.name &&
      entry.original_name === nextEntry.original_name &&
      entry.platform === nextEntry.platform
    );
  });
}

function toPlatformEntityRegistryEntry(entry: {
  entity_id?: string;
  entityId?: string;
  device_id?: string | null;
  deviceId?: string | null;
  area_id?: string | null;
  areaId?: string | null;
  name?: string | null;
  original_name?: string | null;
  originalName?: string | null;
  platform?: string | null;
}): PlatformEntityRegistryEntry {
  return {
    entityId: entry.entity_id ?? entry.entityId ?? '',
    deviceId: entry.device_id ?? entry.deviceId ?? null,
    areaId: entry.area_id ?? entry.areaId ?? null,
    name: entry.name ?? entry.original_name ?? entry.originalName ?? null,
    platform: entry.platform ?? null,
  };
}

function toPlatformEntitySnapshotMap(
  entities: HassEntities | null | undefined
): PlatformEntitySnapshotMap | null {
  if (
    entities === cachedSourceEntities ||
    areEquivalentEntitySnapshots(cachedSourceEntities, entities)
  ) {
    cachedSourceEntities = entities;
    return cachedPlatformEntities;
  }

  cachedSourceEntities = entities;

  if (!entities) {
    cachedPlatformEntities = null;
    return null;
  }

  cachedPlatformEntities = Object.fromEntries(
    Object.entries(entities).map(([entityId, entity]) => [
      entityId,
      {
        entityId,
        state: entity.state,
        attributes: (entity.attributes as Record<string, unknown> | undefined) ?? {},
        lastChanged: entity.last_changed,
        lastUpdated: entity.last_updated,
      },
    ])
  );

  return cachedPlatformEntities;
}

function toPlatformEntityRegistryEntries(
  entityRegistry: HomeAssistantEntityRegistryEntry[]
): PlatformEntityRegistryEntry[] {
  if (
    entityRegistry === cachedSourceRegistry ||
    areEquivalentRegistryEntries(cachedSourceRegistry, entityRegistry)
  ) {
    cachedSourceRegistry = entityRegistry;
    return cachedPlatformRegistry;
  }

  cachedSourceRegistry = entityRegistry;
  cachedPlatformRegistry = entityRegistry.map(toPlatformEntityRegistryEntry);
  return cachedPlatformRegistry;
}

function subscribeHomeAssistantEvent(
  event: 'entities' | 'registries' | 'config',
  listener: () => void
) {
  return addHomeAssistantListener(event, () => {
    listener();
  });
}

function getHomeAssistantEntitiesSnapshot(): HassEntities | null {
  const entities = getHomeAssistantEntities();
  if (entities) {
    return entities;
  }

  return getHomeAssistantStoreState().entities;
}

function getHomeAssistantEntityRegistrySnapshot(): HomeAssistantEntityRegistryEntry[] {
  const entityRegistry = getHomeAssistantEntityRegistry();
  if (entityRegistry.length > 0) {
    return entityRegistry;
  }

  return getHomeAssistantStoreState().entityRegistry ?? EMPTY_HASS_ENTITY_REGISTRY;
}

function getHomeAssistantConfigSnapshot(): HassConfig | null {
  const config = getHomeAssistantConfig();
  if (config) {
    return config;
  }

  return getHomeAssistantStoreState().config;
}

function getStableHomeAssistantConfigSnapshot(): HassConfig | null {
  const config = getHomeAssistantConfigSnapshot();
  if (config === cachedSourceConfig) {
    return cachedPlatformConfig;
  }

  if (cachedSourceConfig && config && areDataEqual(cachedSourceConfig, config)) {
    cachedSourceConfig = config;
    return cachedPlatformConfig;
  }

  cachedSourceConfig = config;
  cachedPlatformConfig = config;
  return cachedPlatformConfig;
}

export const homeAssistantEntityRuntimeService: ProviderEntityRuntimeService = {
  getEntitySnapshots: () => toPlatformEntitySnapshotMap(getHomeAssistantEntitiesSnapshot()),
  subscribeEntitySnapshots: (listener) => subscribeHomeAssistantEvent('entities', listener),
  getEntityRegistryEntries: () =>
    toPlatformEntityRegistryEntries(getHomeAssistantEntityRegistrySnapshot()),
  subscribeEntityRegistryEntries: (listener) => subscribeHomeAssistantEvent('registries', listener),
  getConfig: () => getStableHomeAssistantConfigSnapshot(),
  subscribeConfig: (listener) => subscribeHomeAssistantEvent('config', listener),
};

export function resetHomeAssistantEntityRuntimeServiceCachesForTests() {
  cachedSourceEntities = undefined;
  cachedPlatformEntities = null;
  cachedSourceRegistry = null;
  cachedPlatformRegistry = [];
  cachedSourceConfig = null;
  cachedPlatformConfig = null;
}
