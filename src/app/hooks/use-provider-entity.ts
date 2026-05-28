import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { useMemo } from 'react';
import { shallow } from 'zustand/shallow';
import { resolveHomeAssistantTemperatureUnit } from '@/app/hooks/entity-utils';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@/app/platform/provider-feature-models';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import { homeAssistantSelectors, integrationSelectors } from '@/app/stores/selectors';
import type { IntegrationProviderId } from '@/app/types/provider';
import { resolveHomeAssistantEntityId } from '@/app/utils/provider-entity-id';
import type { HomeAssistantEntityRegistryEntry } from '../services/home-assistant.service';
import { useIntegrationStore } from './use-integration-store';
import { useProviderDevice } from './use-provider-device';

const EMPTY_ENTITY_SNAPSHOTS: PlatformEntitySnapshotMap = {};
const EMPTY_ENTITY_SNAPSHOT_RECORD: Record<string, PlatformEntitySnapshot | undefined> = {};
const EMPTY_HASS_ENTITY_REGISTRY: HomeAssistantEntityRegistryEntry[] = [];
const EMPTY_HASS_ENTITY_RECORD: Record<string, HassEntity | undefined> = {};

function selectUndefinedEntity() {
  return undefined;
}

function selectEmptyHassEntities(): HassEntities | null {
  return null;
}

function selectEmptyHassEntityRegistry(): HomeAssistantEntityRegistryEntry[] {
  return EMPTY_HASS_ENTITY_REGISTRY;
}

function selectEmptyHassEntityRecord() {
  return EMPTY_HASS_ENTITY_RECORD;
}

export function toPlatformEntitySnapshot(
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

export function toPlatformEntityRegistryEntry(entry: {
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

function resolveEntityProviderId(
  entityId: string,
  providerId: IntegrationProviderId | undefined
): IntegrationProviderId | undefined {
  if (providerId) {
    return providerId;
  }

  const resolvedHomeAssistantEntityId = resolveHomeAssistantEntityId(entityId);
  if (resolvedHomeAssistantEntityId) {
    return 'home_assistant';
  }

  return undefined;
}

export function useProviderEntitySnapshot(entityId: string): PlatformEntitySnapshot | undefined {
  const providerDevice = useProviderDevice(entityId);
  const resolvedProviderId = resolveEntityProviderId(entityId, providerDevice?.providerId);
  const homeAssistantEntityId = useMemo(
    () =>
      resolvedProviderId === 'home_assistant'
        ? resolveHomeAssistantEntityId(entityId, resolvedProviderId)
        : null,
    [entityId, resolvedProviderId]
  );

  const entity = useHomeAssistant(
    homeAssistantEntityId
      ? homeAssistantSelectors.entity(homeAssistantEntityId)
      : selectUndefinedEntity
  );

  return useMemo(
    () =>
      entity && homeAssistantEntityId
        ? toPlatformEntitySnapshot(homeAssistantEntityId, entity)
        : undefined,
    [entity, homeAssistantEntityId]
  );
}

export function useProviderEntitySnapshots(options?: {
  providerId?: IntegrationProviderId;
  enabled?: boolean;
}): PlatformEntitySnapshotMap | null {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const enabled = options?.enabled ?? true;

  const entities = useHomeAssistant(
    enabled && resolvedProviderId === 'home_assistant'
      ? homeAssistantSelectors.entities
      : selectEmptyHassEntities
  );

  return useMemo(() => {
    if (!entities) {
      return null;
    }

    return Object.fromEntries(
      Object.entries(entities).map(([snapshotEntityId, entity]) => [
        snapshotEntityId,
        toPlatformEntitySnapshot(snapshotEntityId, entity),
      ])
    );
  }, [entities]);
}

export function useProviderEntityRegistryEntries(options?: {
  providerId?: IntegrationProviderId;
  enabled?: boolean;
}): PlatformEntityRegistryEntry[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const enabled = options?.enabled ?? true;

  const entityRegistry = useHomeAssistant(
    enabled && resolvedProviderId === 'home_assistant'
      ? homeAssistantSelectors.entityRegistry
      : selectEmptyHassEntityRegistry
  );

  return useMemo(() => entityRegistry.map(toPlatformEntityRegistryEntry), [entityRegistry]);
}

export function useProviderEntitySnapshotRecord(
  entityIds: string[],
  options?: {
    providerId?: IntegrationProviderId;
    enabled?: boolean;
  }
): Record<string, PlatformEntitySnapshot | undefined> {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const enabled = options?.enabled ?? true;
  const resolvedEntityIds = useMemo(
    () =>
      entityIds
        .map((entityId) => resolveHomeAssistantEntityId(entityId, resolvedProviderId) ?? entityId)
        .filter((entityId, index, ids) => ids.indexOf(entityId) === index),
    [entityIds, resolvedProviderId]
  );

  const entityRecord = useHomeAssistant(
    enabled && resolvedProviderId === 'home_assistant'
      ? (state: HomeAssistantStore) => {
          if (!resolvedEntityIds.length || !state.entities) {
            return EMPTY_HASS_ENTITY_RECORD;
          }

          return Object.fromEntries(
            resolvedEntityIds.map((entityId) => {
              const entity = state.entities?.[entityId];
              return [entityId, entity];
            })
          );
        }
      : selectEmptyHassEntityRecord,
    shallow
  );

  return useMemo(() => {
    if (!resolvedEntityIds.length) {
      return EMPTY_ENTITY_SNAPSHOT_RECORD;
    }

    return Object.fromEntries(
      resolvedEntityIds.map((snapshotEntityId) => {
        const entity = entityRecord[snapshotEntityId];
        return [
          snapshotEntityId,
          entity ? toPlatformEntitySnapshot(snapshotEntityId, entity) : undefined,
        ];
      })
    );
  }, [entityRecord, resolvedEntityIds]);
}

export function useProviderTemperatureUnit(providerId?: IntegrationProviderId) {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = providerId ?? currentProviderId;

  return useHomeAssistant(
    resolvedProviderId === 'home_assistant'
      ? (state: HomeAssistantStore) => resolveHomeAssistantTemperatureUnit(state.config)
      : () => undefined
  );
}

export function useProviderConnectionState(providerId?: IntegrationProviderId): boolean {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = providerId ?? currentProviderId;
  const runtime = useIntegrationStore(integrationSelectors.providerRuntimeById(resolvedProviderId));

  return runtime.connected;
}

export { EMPTY_ENTITY_SNAPSHOTS };
