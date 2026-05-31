import { resolveProviderTemperatureUnit } from '@navet/app/hooks/entity-utils';
import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { useMemo, useSyncExternalStore } from 'react';
import { useIntegrationStore } from './use-integration-store';
import { useProviderEntityModel } from './use-provider-device';

const EMPTY_ENTITY_SNAPSHOT_RECORD: Record<string, PlatformEntitySnapshot | undefined> = {};
const EMPTY_ENTITY_SNAPSHOTS: PlatformEntitySnapshotMap = {};
const EMPTY_ENTITY_REGISTRY: PlatformEntityRegistryEntry[] = [];
const EMPTY_PROVIDER_CONFIG = null;
type ProviderTemperatureConfig = {
  unit_system?: { temperature?: unknown };
  temperature_unit?: unknown;
  temperatureUnit?: unknown;
};

function selectUndefinedEntity() {
  return undefined;
}

function subscribeNoop() {
  return () => {};
}

function useProviderEntityRuntimeSnapshots(
  providerId: IntegrationProviderId | undefined,
  enabled: boolean
): PlatformEntitySnapshotMap | null {
  const runtimeService = providerId
    ? (getProviderRuntimeRegistration(providerId).entityRuntimeService ?? null)
    : null;

  return useSyncExternalStore(
    enabled && runtimeService ? runtimeService.subscribeEntitySnapshots : subscribeNoop,
    enabled && runtimeService ? runtimeService.getEntitySnapshots : () => null,
    () => null
  );
}

function useProviderEntityRuntimeRegistry(
  providerId: IntegrationProviderId | undefined,
  enabled: boolean
): PlatformEntityRegistryEntry[] {
  const runtimeService = providerId
    ? (getProviderRuntimeRegistration(providerId).entityRuntimeService ?? null)
    : null;

  return useSyncExternalStore(
    enabled && runtimeService ? runtimeService.subscribeEntityRegistryEntries : subscribeNoop,
    enabled && runtimeService
      ? runtimeService.getEntityRegistryEntries
      : () => EMPTY_ENTITY_REGISTRY,
    () => EMPTY_ENTITY_REGISTRY
  );
}

function useProviderConfigRuntime(providerId: IntegrationProviderId | undefined, enabled: boolean) {
  const runtimeService = providerId
    ? (getProviderRuntimeRegistration(providerId).entityRuntimeService ?? null)
    : null;

  return useSyncExternalStore(
    enabled && runtimeService ? runtimeService.subscribeConfig : subscribeNoop,
    enabled && runtimeService ? runtimeService.getConfig : () => EMPTY_PROVIDER_CONFIG,
    () => EMPTY_PROVIDER_CONFIG
  );
}

function normalizeProviderTemperatureConfig(config: unknown): ProviderTemperatureConfig | null {
  if (!config || typeof config !== 'object') {
    return null;
  }

  return config as ProviderTemperatureConfig;
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
  providerId: IntegrationProviderId | undefined,
  currentProviderId: IntegrationProviderId
): IntegrationProviderId | undefined {
  if (providerId) {
    return providerId;
  }

  const scopedId = parseProviderScopedId(entityId);
  if (scopedId) {
    return scopedId.providerId;
  }

  return currentProviderId;
}

function resolveProviderRuntimeEntityId(
  entityId: string,
  providerId: IntegrationProviderId | undefined
): string | null {
  if (!entityId || !providerId) {
    return null;
  }

  const scopedId = parseProviderScopedId(entityId);
  if (scopedId) {
    return scopedId.providerId === providerId ? scopedId.nativeId : null;
  }

  return entityId;
}

export function useProviderEntitySnapshot(entityId: string): PlatformEntitySnapshot | undefined {
  const providerEntity = useProviderEntityModel(entityId);
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = resolveEntityProviderId(
    entityId,
    providerEntity?.providerId,
    currentProviderId
  );
  const runtimeEntityId = useMemo(
    () => resolveProviderRuntimeEntityId(entityId, resolvedProviderId),
    [entityId, resolvedProviderId]
  );
  const entities = useProviderEntityRuntimeSnapshots(resolvedProviderId, Boolean(runtimeEntityId));
  const entity = runtimeEntityId ? entities?.[runtimeEntityId] : selectUndefinedEntity();

  return useMemo(() => (entity && runtimeEntityId ? entity : undefined), [entity, runtimeEntityId]);
}

export function useProviderEntitySnapshots(options?: {
  providerId?: IntegrationProviderId;
  enabled?: boolean;
}): PlatformEntitySnapshotMap | null {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const enabled = options?.enabled ?? true;
  return useProviderEntityRuntimeSnapshots(resolvedProviderId, enabled);
}

export function useProviderEntityRegistryEntries(options?: {
  providerId?: IntegrationProviderId;
  enabled?: boolean;
}): PlatformEntityRegistryEntry[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const enabled = options?.enabled ?? true;
  return useProviderEntityRuntimeRegistry(resolvedProviderId, enabled);
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
        .map((entityId) => resolveProviderRuntimeEntityId(entityId, resolvedProviderId) ?? entityId)
        .filter((entityId, index, ids) => ids.indexOf(entityId) === index),
    [entityIds, resolvedProviderId]
  );
  const entities = useProviderEntityRuntimeSnapshots(resolvedProviderId, enabled);

  const entityRecord = useMemo(() => {
    if (!resolvedEntityIds.length || !entities) {
      return EMPTY_ENTITY_SNAPSHOT_RECORD;
    }

    return Object.fromEntries(
      resolvedEntityIds.map((snapshotEntityId) => [snapshotEntityId, entities[snapshotEntityId]])
    );
  }, [entities, resolvedEntityIds]);

  return useMemo(() => {
    if (!resolvedEntityIds.length) {
      return EMPTY_ENTITY_SNAPSHOT_RECORD;
    }

    return Object.fromEntries(
      resolvedEntityIds.map((snapshotEntityId) => {
        const entity = entityRecord[snapshotEntityId];
        return [snapshotEntityId, entity];
      })
    );
  }, [entityRecord, resolvedEntityIds]);
}

export function useProviderTemperatureUnit(providerId?: IntegrationProviderId) {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = providerId ?? currentProviderId;
  const config = useProviderConfigRuntime(resolvedProviderId, true);

  return useMemo(
    () => resolveProviderTemperatureUnit(normalizeProviderTemperatureConfig(config)) ?? undefined,
    [config]
  );
}

export function useProviderConnectionState(providerId?: IntegrationProviderId): boolean {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = providerId ?? currentProviderId;
  const runtime = useIntegrationStore(integrationSelectors.providerRuntimeById(resolvedProviderId));

  return runtime.connected;
}

export { EMPTY_ENTITY_SNAPSHOTS };
