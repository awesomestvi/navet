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
import { areStringArraysEqual } from '@navet/app/utils/structural-equality';
import { useMemo, useRef, useSyncExternalStore } from 'react';
import { useIntegrationStore } from './use-integration-store';
import { useProviderEntityModel } from './use-provider-device';

const EMPTY_ENTITY_SNAPSHOT_RECORD: Record<string, PlatformEntitySnapshot | undefined> = {};
const EMPTY_ENTITY_SNAPSHOTS: PlatformEntitySnapshotMap = {};
const EMPTY_ENTITY_REGISTRY: PlatformEntityRegistryEntry[] = [];
const EMPTY_PROVIDER_CONFIG = null;
const EMPTY_ENTITY_IDS: string[] = [];
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

function useProviderEntityRuntimeSnapshot(
  providerId: IntegrationProviderId | undefined,
  entityId: string | null,
  enabled: boolean
): PlatformEntitySnapshot | undefined {
  const runtimeService = providerId
    ? (getProviderRuntimeRegistration(providerId).entityRuntimeService ?? null)
    : null;

  return useSyncExternalStore(
    enabled && runtimeService && entityId
      ? runtimeService.subscribeEntitySnapshot
        ? (listener) =>
            runtimeService.subscribeEntitySnapshot?.(entityId, listener) ?? subscribeNoop()
        : runtimeService.subscribeEntitySnapshots
      : subscribeNoop,
    enabled && runtimeService && entityId
      ? runtimeService.getEntitySnapshot
        ? () => runtimeService.getEntitySnapshot?.(entityId)
        : () => runtimeService.getEntitySnapshots()?.[entityId]
      : selectUndefinedEntity,
    selectUndefinedEntity
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

function resolveUniqueRuntimeEntityIds(
  entityIds: string[],
  providerId: IntegrationProviderId | undefined
): string[] {
  return entityIds
    .map((entityId) => resolveProviderRuntimeEntityId(entityId, providerId) ?? entityId)
    .filter((entityId, index, ids) => ids.indexOf(entityId) === index);
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
  const entity = useProviderEntityRuntimeSnapshot(
    resolvedProviderId,
    runtimeEntityId,
    Boolean(runtimeEntityId)
  );

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

export function useProviderEntityRegistryEntry(
  entityId: string
): PlatformEntityRegistryEntry | undefined {
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
  const runtimeService = resolvedProviderId
    ? (getProviderRuntimeRegistration(resolvedProviderId).entityRuntimeService ?? null)
    : null;

  const entry = useSyncExternalStore(
    runtimeEntityId && runtimeService
      ? runtimeService.subscribeEntityRegistryEntry
        ? (listener) =>
            runtimeService.subscribeEntityRegistryEntry?.(runtimeEntityId, listener) ??
            subscribeNoop()
        : runtimeService.subscribeEntityRegistryEntries
      : subscribeNoop,
    runtimeEntityId && runtimeService
      ? runtimeService.getEntityRegistryEntry
        ? () => runtimeService.getEntityRegistryEntry?.(runtimeEntityId)
        : () =>
            runtimeService
              .getEntityRegistryEntries()
              .find((registryEntry) => registryEntry.entityId === runtimeEntityId)
      : selectUndefinedEntity,
    selectUndefinedEntity
  );

  return useMemo(() => (entry && runtimeEntityId ? entry : undefined), [entry, runtimeEntityId]);
}

export function useProviderEntityIdsByPrefix(
  prefixes: string[],
  options?: {
    providerId?: IntegrationProviderId;
    enabled?: boolean;
  }
): string[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const enabled = options?.enabled ?? true;
  const normalizedPrefixes = useMemo(
    () =>
      prefixes
        .map((prefix) => prefix.trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [prefixes]
  );

  return useIntegrationStore((state) => {
    if (!enabled || !resolvedProviderId || normalizedPrefixes.length === 0) {
      return EMPTY_ENTITY_IDS;
    }

    const providerEntities = state.providerEntitiesByProviderId[resolvedProviderId];
    if (!providerEntities) {
      return EMPTY_ENTITY_IDS;
    }

    return Object.values(providerEntities)
      .map((entity) => entity.externalId)
      .filter(
        (entityId): entityId is string =>
          typeof entityId === 'string' &&
          normalizedPrefixes.some((prefix) => entityId.startsWith(prefix))
      )
      .sort((left, right) => left.localeCompare(right));
  }, areStringArraysEqual);
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

export function useProviderEntityRegistryEntriesByIds(
  entityIds: string[],
  options?: {
    providerId?: IntegrationProviderId;
    enabled?: boolean;
  }
): PlatformEntityRegistryEntry[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const enabled = options?.enabled ?? true;
  const resolvedEntityIds = useMemo(
    () => resolveUniqueRuntimeEntityIds(entityIds, resolvedProviderId),
    [entityIds, resolvedProviderId]
  );
  const runtimeService = resolvedProviderId
    ? (getProviderRuntimeRegistration(resolvedProviderId).entityRuntimeService ?? null)
    : null;
  const previousEntriesRef = useRef<PlatformEntityRegistryEntry[]>(EMPTY_ENTITY_REGISTRY);

  return useSyncExternalStore(
    enabled && runtimeService ? runtimeService.subscribeEntityRegistryEntries : subscribeNoop,
    () => {
      if (!enabled || !runtimeService || resolvedEntityIds.length === 0) {
        previousEntriesRef.current = EMPTY_ENTITY_REGISTRY;
        return EMPTY_ENTITY_REGISTRY;
      }

      const nextEntries = resolvedEntityIds
        .map((entityId) => {
          if (runtimeService.getEntityRegistryEntry) {
            return runtimeService.getEntityRegistryEntry(entityId);
          }

          return runtimeService
            .getEntityRegistryEntries()
            .find((entry) => entry.entityId === entityId);
        })
        .filter((entry): entry is PlatformEntityRegistryEntry => entry !== undefined);
      const previousEntries = previousEntriesRef.current;
      if (
        previousEntries.length === nextEntries.length &&
        previousEntries.every((entry, index) => entry === nextEntries[index])
      ) {
        return previousEntries;
      }

      previousEntriesRef.current = nextEntries;
      return nextEntries;
    },
    () => EMPTY_ENTITY_REGISTRY
  );
}

export function useProviderEntityRegistryEntriesByDeviceId(
  deviceId: string | null,
  options?: {
    providerId?: IntegrationProviderId;
    enabled?: boolean;
  }
): PlatformEntityRegistryEntry[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const enabled = options?.enabled ?? true;
  const runtimeService = resolvedProviderId
    ? (getProviderRuntimeRegistration(resolvedProviderId).entityRuntimeService ?? null)
    : null;
  const previousEntriesRef = useRef<PlatformEntityRegistryEntry[]>(EMPTY_ENTITY_REGISTRY);

  return useSyncExternalStore(
    enabled && runtimeService ? runtimeService.subscribeEntityRegistryEntries : subscribeNoop,
    () => {
      if (!enabled || !runtimeService || !deviceId) {
        previousEntriesRef.current = EMPTY_ENTITY_REGISTRY;
        return EMPTY_ENTITY_REGISTRY;
      }

      const nextEntries = runtimeService
        .getEntityRegistryEntries()
        .filter((entry) => entry.deviceId === deviceId)
        .sort((left, right) => left.entityId.localeCompare(right.entityId));
      const previousEntries = previousEntriesRef.current;
      if (
        previousEntries.length === nextEntries.length &&
        previousEntries.every((entry, index) => entry === nextEntries[index])
      ) {
        return previousEntries;
      }

      previousEntriesRef.current = nextEntries;
      return nextEntries;
    },
    () => EMPTY_ENTITY_REGISTRY
  );
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
    () => resolveUniqueRuntimeEntityIds(entityIds, resolvedProviderId),
    [entityIds, resolvedProviderId]
  );
  const runtimeService = resolvedProviderId
    ? (getProviderRuntimeRegistration(resolvedProviderId).entityRuntimeService ?? null)
    : null;
  const previousRecordRef = useRef<Record<string, PlatformEntitySnapshot | undefined>>(
    EMPTY_ENTITY_SNAPSHOT_RECORD
  );

  return useSyncExternalStore(
    enabled && runtimeService ? runtimeService.subscribeEntitySnapshots : subscribeNoop,
    () => {
      if (!enabled || !runtimeService || resolvedEntityIds.length === 0) {
        previousRecordRef.current = EMPTY_ENTITY_SNAPSHOT_RECORD;
        return EMPTY_ENTITY_SNAPSHOT_RECORD;
      }

      const snapshotMap = runtimeService.getEntitySnapshots();
      if (!snapshotMap) {
        previousRecordRef.current = EMPTY_ENTITY_SNAPSHOT_RECORD;
        return EMPTY_ENTITY_SNAPSHOT_RECORD;
      }

      const previousRecord = previousRecordRef.current;
      const nextRecord = Object.fromEntries(
        resolvedEntityIds.map((entityId) => [
          entityId,
          runtimeService.getEntitySnapshot
            ? runtimeService.getEntitySnapshot(entityId)
            : snapshotMap[entityId],
        ])
      );
      const unchanged =
        Object.keys(previousRecord).length === resolvedEntityIds.length &&
        resolvedEntityIds.every((entityId) => previousRecord[entityId] === nextRecord[entityId]);

      if (unchanged) {
        return previousRecord;
      }

      previousRecordRef.current = nextRecord;
      return nextRecord;
    },
    () => EMPTY_ENTITY_SNAPSHOT_RECORD
  );
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
