import { resolveProviderTemperatureUnit } from '@navet/app/hooks/entity-utils';
import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import {
  EMPTY_ENTITY_IDS,
  EMPTY_ENTITY_REGISTRY,
  EMPTY_ENTITY_SNAPSHOT_RECORD,
  EMPTY_ENTITY_SNAPSHOTS,
  getProviderRuntimeQuery,
  resolveEntityProviderId,
  resolveProviderRuntimeEntityId,
  resolveUniqueRuntimeEntityIds,
  selectProviderEntityIdsByPrefixes,
} from '@navet/app/provider-runtime-query';
import type { IntegrationStore } from '@navet/app/stores/integration-store';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { areStringArraysEqual } from '@navet/app/utils/structural-equality';
import { useCallback, useMemo, useRef, useSyncExternalStore } from 'react';
import { useIntegrationStore, useProviderId } from './use-integration-store';
import { useProviderEntityModel } from './use-provider-device';

const EMPTY_PROVIDER_CONFIG = null;

type ProviderTemperatureConfig = {
  unit_system?: { temperature?: unknown };
  temperature_unit?: unknown;
  temperatureUnit?: unknown;
};

function subscribeNoop() {
  return () => {};
}

function selectUndefinedEntity() {
  return undefined;
}

function normalizeProviderTemperatureConfig(config: unknown): ProviderTemperatureConfig | null {
  return config && typeof config === 'object' ? (config as ProviderTemperatureConfig) : null;
}

function areRegistrySelectionsEqual(
  previous: PlatformEntityRegistryEntry[],
  next: PlatformEntityRegistryEntry[]
) {
  return previous.length === next.length && previous.every((entry, index) => entry === next[index]);
}

function areSnapshotMapsEqual(
  previous: PlatformEntitySnapshotMap,
  next: PlatformEntitySnapshotMap
) {
  const ids = Object.keys(next);
  return (
    Object.keys(previous).length === ids.length && ids.every((id) => previous[id] === next[id])
  );
}

function areSnapshotRecordsEqual(
  previous: Record<string, PlatformEntitySnapshot | undefined>,
  next: Record<string, PlatformEntitySnapshot | undefined>
) {
  const ids = Object.keys(next);
  return (
    Object.keys(previous).length === ids.length &&
    ids.every((id) => Object.hasOwn(previous, id) && previous[id] === next[id])
  );
}

function useStableExternalSelection<Selection>(
  subscribe: (listener: () => void) => () => void,
  getSelection: (() => Selection) | null,
  empty: Selection,
  equal: (previous: Selection, next: Selection) => boolean
) {
  const previousRef = useRef<Selection>(empty);
  return useSyncExternalStore(
    getSelection ? subscribe : subscribeNoop,
    () => {
      if (!getSelection) {
        previousRef.current = empty;
        return empty;
      }
      const next = getSelection();
      if (equal(previousRef.current, next)) return previousRef.current;
      previousRef.current = next;
      return next;
    },
    () => empty
  );
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
    attributes: entity.attributes ?? {},
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

function useResolvedProviderId(entityId: string) {
  const providerEntity = useProviderEntityModel(entityId);
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  return resolveEntityProviderId(entityId, providerEntity?.providerId, currentProviderId);
}

export function useProviderEntitySnapshot(entityId: string) {
  const providerId = useResolvedProviderId(entityId);
  const runtimeEntityId = useMemo(
    () => resolveProviderRuntimeEntityId(entityId, providerId),
    [entityId, providerId]
  );
  const query = useMemo(() => getProviderRuntimeQuery(providerId), [providerId]);
  const subscribe = useCallback(
    (listener: () => void) =>
      runtimeEntityId ? query.subscribeSnapshot(runtimeEntityId, listener) : subscribeNoop(),
    [query, runtimeEntityId]
  );
  const getSnapshot = useCallback(
    () => (runtimeEntityId ? query.getSnapshot(runtimeEntityId) : undefined),
    [query, runtimeEntityId]
  );
  return useSyncExternalStore(
    runtimeEntityId ? subscribe : subscribeNoop,
    runtimeEntityId ? getSnapshot : selectUndefinedEntity,
    selectUndefinedEntity
  );
}

export function useProviderEntitySnapshots(options?: {
  providerId?: IntegrationProviderId;
  enabled?: boolean;
}): PlatformEntitySnapshotMap | null {
  const providerId = useProviderId(options?.providerId);
  const query = useMemo(() => getProviderRuntimeQuery(providerId), [providerId]);
  const enabled = options?.enabled ?? true;
  return useSyncExternalStore(
    enabled ? query.subscribeSnapshots : subscribeNoop,
    enabled ? query.getSnapshots : () => null,
    () => null
  );
}

export function useProviderEntitySnapshotsByPrefix(
  prefixes: readonly string[],
  options?: { providerId?: IntegrationProviderId; enabled?: boolean }
) {
  const providerId = useProviderId(options?.providerId);
  const query = useMemo(() => getProviderRuntimeQuery(providerId), [providerId]);
  const normalizedPrefixes = useMemo(
    () => prefixes.map((prefix) => prefix.trim()).filter(Boolean),
    [prefixes]
  );
  const getSelection = useCallback(
    () => query.selectSnapshotsByPrefixes(normalizedPrefixes),
    [normalizedPrefixes, query]
  );
  return useStableExternalSelection(
    query.subscribeSnapshots,
    options?.enabled !== false && normalizedPrefixes.length > 0 ? getSelection : null,
    EMPTY_ENTITY_SNAPSHOTS,
    areSnapshotMapsEqual
  );
}

export function useProviderEntityRegistryEntry(entityId: string) {
  const providerId = useResolvedProviderId(entityId);
  const runtimeEntityId = useMemo(
    () => resolveProviderRuntimeEntityId(entityId, providerId),
    [entityId, providerId]
  );
  const query = useMemo(() => getProviderRuntimeQuery(providerId), [providerId]);
  const subscribe = useCallback(
    (listener: () => void) =>
      runtimeEntityId ? query.subscribeRegistryEntry(runtimeEntityId, listener) : subscribeNoop(),
    [query, runtimeEntityId]
  );
  const getSnapshot = useCallback(
    () => (runtimeEntityId ? query.getRegistryEntry(runtimeEntityId) : undefined),
    [query, runtimeEntityId]
  );
  return useSyncExternalStore(
    runtimeEntityId ? subscribe : subscribeNoop,
    runtimeEntityId ? getSnapshot : selectUndefinedEntity,
    selectUndefinedEntity
  );
}

export function useProviderEntityIdsByPrefix(
  prefixes: string[],
  options?: { providerId?: IntegrationProviderId; enabled?: boolean }
) {
  const providerId = useProviderId(options?.providerId);
  const normalizedPrefixes = useMemo(
    () =>
      prefixes
        .map((prefix) => prefix.trim())
        .filter(Boolean)
        .sort((left, right) => left.localeCompare(right)),
    [prefixes]
  );
  const selector = useMemo(
    () => (state: IntegrationStore) =>
      options?.enabled === false
        ? EMPTY_ENTITY_IDS
        : selectProviderEntityIdsByPrefixes(
            state.providerEntitiesByProviderId[providerId],
            normalizedPrefixes
          ),
    [normalizedPrefixes, options?.enabled, providerId]
  );
  return useIntegrationStore(selector, areStringArraysEqual);
}

export function useProviderEntityRegistryEntries(options?: {
  providerId?: IntegrationProviderId;
  enabled?: boolean;
}) {
  const providerId = useProviderId(options?.providerId);
  const query = useMemo(() => getProviderRuntimeQuery(providerId), [providerId]);
  const enabled = options?.enabled ?? true;
  return useSyncExternalStore(
    enabled ? query.subscribeRegistry : subscribeNoop,
    enabled ? query.getRegistry : () => EMPTY_ENTITY_REGISTRY,
    () => EMPTY_ENTITY_REGISTRY
  );
}

export function useProviderEntityRegistryEntriesByIds(
  entityIds: string[],
  options?: { providerId?: IntegrationProviderId; enabled?: boolean }
) {
  const providerId = useProviderId(options?.providerId);
  const query = useMemo(() => getProviderRuntimeQuery(providerId), [providerId]);
  const runtimeEntityIds = useMemo(
    () => resolveUniqueRuntimeEntityIds(entityIds, providerId),
    [entityIds, providerId]
  );
  const getSelection = useCallback(
    () => query.selectRegistryByIds(runtimeEntityIds),
    [query, runtimeEntityIds]
  );
  return useStableExternalSelection(
    query.subscribeRegistry,
    options?.enabled !== false && runtimeEntityIds.length > 0 ? getSelection : null,
    EMPTY_ENTITY_REGISTRY,
    areRegistrySelectionsEqual
  );
}

export function useProviderEntityRegistryEntriesByDeviceId(
  deviceId: string | null,
  options?: { providerId?: IntegrationProviderId; enabled?: boolean }
) {
  const providerId = useProviderId(options?.providerId);
  const query = useMemo(() => getProviderRuntimeQuery(providerId), [providerId]);
  const getSelection = useCallback(
    () => query.selectRegistryByDeviceId(deviceId),
    [deviceId, query]
  );
  return useStableExternalSelection(
    query.subscribeRegistry,
    options?.enabled !== false && deviceId ? getSelection : null,
    EMPTY_ENTITY_REGISTRY,
    areRegistrySelectionsEqual
  );
}

export function useProviderEntitySnapshotRecord(
  entityIds: string[],
  options?: { providerId?: IntegrationProviderId; enabled?: boolean }
) {
  const providerId = useProviderId(options?.providerId);
  const query = useMemo(() => getProviderRuntimeQuery(providerId), [providerId]);
  const runtimeEntityIds = useMemo(
    () => resolveUniqueRuntimeEntityIds(entityIds, providerId),
    [entityIds, providerId]
  );
  const getSelection = useCallback(
    () => query.selectSnapshotRecord(runtimeEntityIds),
    [query, runtimeEntityIds]
  );
  return useStableExternalSelection(
    query.subscribeSnapshots,
    options?.enabled !== false && runtimeEntityIds.length > 0 ? getSelection : null,
    EMPTY_ENTITY_SNAPSHOT_RECORD,
    areSnapshotRecordsEqual
  );
}

export function useProviderTemperatureUnit(providerId?: IntegrationProviderId) {
  const resolvedProviderId = useProviderId(providerId);
  const query = useMemo(() => getProviderRuntimeQuery(resolvedProviderId), [resolvedProviderId]);
  const config = useSyncExternalStore(
    query.subscribeConfig,
    query.getConfig,
    () => EMPTY_PROVIDER_CONFIG
  );
  return useMemo(
    () => resolveProviderTemperatureUnit(normalizeProviderTemperatureConfig(config)) ?? undefined,
    [config]
  );
}

export function useProviderConnectionState(providerId?: IntegrationProviderId) {
  const resolvedProviderId = useProviderId(providerId);
  return useIntegrationStore(integrationSelectors.providerRuntimeById(resolvedProviderId))
    .connected;
}

export { EMPTY_ENTITY_SNAPSHOTS };
