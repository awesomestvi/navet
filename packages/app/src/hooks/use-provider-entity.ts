import { resolveProviderTemperatureUnit } from '@navet/app/hooks/entity-utils';
import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import type { IntegrationStore } from '@navet/app/stores/integration-store';
import { integrationSelectors } from '@navet/app/stores/selectors';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { areStringArraysEqual } from '@navet/app/utils/structural-equality';
import type { NavetEntity } from '@navet/core/types';
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

/**
 * Subscribes to entity domains while preserving the filtered map reference
 * when provider updates affect only entities outside those domains.
 */
export function useProviderEntitySnapshotsByPrefix(
  prefixes: readonly string[],
  options?: {
    providerId?: IntegrationProviderId;
    enabled?: boolean;
  }
): PlatformEntitySnapshotMap {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const enabled = options?.enabled ?? true;
  const normalizedPrefixes = useMemo(
    () => prefixes.map((prefix) => prefix.trim()).filter(Boolean),
    [prefixes]
  );
  const runtimeService = resolvedProviderId
    ? (getProviderRuntimeRegistration(resolvedProviderId).entityRuntimeService ?? null)
    : null;
  const filterKey = `${resolvedProviderId ?? ''}\n${normalizedPrefixes.join('\n')}`;
  const previousFilterKeyRef = useRef('');
  const previousSourceSnapshotsRef = useRef<PlatformEntitySnapshotMap | null | undefined>(
    undefined
  );
  const previousSnapshotsRef = useRef<PlatformEntitySnapshotMap>(EMPTY_ENTITY_SNAPSHOTS);

  return useSyncExternalStore(
    enabled && runtimeService ? runtimeService.subscribeEntitySnapshots : subscribeNoop,
    () => {
      if (!enabled || !runtimeService || normalizedPrefixes.length === 0) {
        previousSnapshotsRef.current = EMPTY_ENTITY_SNAPSHOTS;
        return EMPTY_ENTITY_SNAPSHOTS;
      }

      const snapshots = runtimeService.getEntitySnapshots();
      if (!snapshots) {
        previousFilterKeyRef.current = filterKey;
        previousSourceSnapshotsRef.current = snapshots;
        previousSnapshotsRef.current = EMPTY_ENTITY_SNAPSHOTS;
        return EMPTY_ENTITY_SNAPSHOTS;
      }

      if (
        previousFilterKeyRef.current === filterKey &&
        previousSourceSnapshotsRef.current === snapshots
      ) {
        return previousSnapshotsRef.current;
      }

      const nextSnapshots: PlatformEntitySnapshotMap = {};
      for (const [entityId, snapshot] of Object.entries(snapshots)) {
        if (normalizedPrefixes.some((prefix) => entityId.startsWith(prefix))) {
          nextSnapshots[entityId] = snapshot;
        }
      }

      const previousSnapshots = previousSnapshotsRef.current;
      const nextEntityIds = Object.keys(nextSnapshots);
      previousFilterKeyRef.current = filterKey;
      previousSourceSnapshotsRef.current = snapshots;
      if (
        Object.keys(previousSnapshots).length === nextEntityIds.length &&
        nextEntityIds.every((entityId) => previousSnapshots[entityId] === nextSnapshots[entityId])
      ) {
        return previousSnapshots;
      }

      previousSnapshotsRef.current = nextSnapshots;
      return nextSnapshots;
    },
    () => EMPTY_ENTITY_SNAPSHOTS
  );
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
  const selectEntityIds = useMemo(() => {
    let previousProviderEntities: Record<string, NavetEntity> | undefined;
    let previousEntityIds = EMPTY_ENTITY_IDS;

    return (state: IntegrationStore) => {
      if (!enabled || !resolvedProviderId || normalizedPrefixes.length === 0) {
        return EMPTY_ENTITY_IDS;
      }

      const providerEntities = state.providerEntitiesByProviderId[resolvedProviderId];
      if (!providerEntities) {
        return EMPTY_ENTITY_IDS;
      }

      if (providerEntities === previousProviderEntities) {
        return previousEntityIds;
      }

      previousProviderEntities = providerEntities;
      previousEntityIds = Object.values(providerEntities)
        .map((entity) => entity.externalId)
        .filter(
          (entityId): entityId is string =>
            typeof entityId === 'string' &&
            normalizedPrefixes.some((prefix) => entityId.startsWith(prefix))
        )
        .sort((left, right) => left.localeCompare(right));
      return previousEntityIds;
    };
  }, [enabled, normalizedPrefixes, resolvedProviderId]);

  return useIntegrationStore(selectEntityIds, areStringArraysEqual);
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

// Runtime snapshots are immutable external-store values. Weak keys let obsolete
// registries be collected while sharing one index across mounted consumers.
const registryIndexes = new WeakMap<
  PlatformEntityRegistryEntry[],
  {
    byId: Map<string, PlatformEntityRegistryEntry>;
    byDevice: Map<string, PlatformEntityRegistryEntry[]>;
  }
>();

function getRegistryIndex(entries: PlatformEntityRegistryEntry[]) {
  const cached = registryIndexes.get(entries);
  if (cached) return cached;
  const byId = new Map<string, PlatformEntityRegistryEntry>();
  const byDevice = new Map<string, PlatformEntityRegistryEntry[]>();
  for (const entry of entries) {
    byId.set(entry.entityId, entry);
    if (entry.deviceId) {
      const siblings = byDevice.get(entry.deviceId);
      if (siblings) siblings.push(entry);
      else byDevice.set(entry.deviceId, [entry]);
    }
  }
  for (const siblings of byDevice.values()) {
    siblings.sort((left, right) => left.entityId.localeCompare(right.entityId));
  }
  const index = { byId, byDevice };
  registryIndexes.set(entries, index);
  return index;
}

function areRegistrySelectionsEqual(
  previous: PlatformEntityRegistryEntry[],
  next: PlatformEntityRegistryEntry[]
) {
  return previous.length === next.length && previous.every((entry, index) => entry === next[index]);
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

function useRuntimeSelection<Source, Selection>(
  subscribe: (listener: () => void) => () => void,
  getSource: (() => Source) | null,
  select: (source: Source) => Selection,
  empty: Selection,
  equal: (previous: Selection, next: Selection) => boolean
): Selection {
  const cache = useRef<{
    source: Source;
    select: typeof select;
    value: Selection;
  } | null>(null);
  return useSyncExternalStore(
    getSource ? subscribe : subscribeNoop,
    () => {
      if (!getSource) {
        cache.current = null;
        return empty;
      }
      const source = getSource();
      const previous = cache.current;
      if (previous && previous.source === source && previous.select === select) {
        return previous.value;
      }
      const next = select(source);
      const value = previous && equal(previous.value, next) ? previous.value : next;
      cache.current = { source, select, value };
      return value;
    },
    () => empty
  );
}

export function useProviderEntityRegistryEntriesByIds(
  entityIds: string[],
  options?: { providerId?: IntegrationProviderId; enabled?: boolean }
): PlatformEntityRegistryEntry[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const resolvedEntityIds = useMemo(
    () => resolveUniqueRuntimeEntityIds(entityIds, resolvedProviderId),
    [entityIds, resolvedProviderId]
  );
  const runtimeService = getProviderRuntimeRegistration(resolvedProviderId).entityRuntimeService;
  const select = useMemo(
    () => (entries: PlatformEntityRegistryEntry[]) => {
      const { byId } = getRegistryIndex(entries);
      return resolvedEntityIds
        .map((id) => byId.get(id))
        .filter((entry): entry is PlatformEntityRegistryEntry => entry !== undefined);
    },
    [resolvedEntityIds]
  );
  return useRuntimeSelection(
    runtimeService?.subscribeEntityRegistryEntries ?? subscribeNoop,
    options?.enabled !== false && resolvedEntityIds.length > 0 && runtimeService
      ? runtimeService.getEntityRegistryEntries
      : null,
    select,
    EMPTY_ENTITY_REGISTRY,
    areRegistrySelectionsEqual
  );
}

export function useProviderEntityRegistryEntriesByDeviceId(
  deviceId: string | null,
  options?: { providerId?: IntegrationProviderId; enabled?: boolean }
): PlatformEntityRegistryEntry[] {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const runtimeService = getProviderRuntimeRegistration(resolvedProviderId).entityRuntimeService;
  const select = useMemo(
    () => (entries: PlatformEntityRegistryEntry[]) =>
      (deviceId && getRegistryIndex(entries).byDevice.get(deviceId)) || EMPTY_ENTITY_REGISTRY,
    [deviceId]
  );
  return useRuntimeSelection(
    runtimeService?.subscribeEntityRegistryEntries ?? subscribeNoop,
    options?.enabled !== false && deviceId && runtimeService
      ? runtimeService.getEntityRegistryEntries
      : null,
    select,
    EMPTY_ENTITY_REGISTRY,
    areRegistrySelectionsEqual
  );
}

export function useProviderEntitySnapshotRecord(
  entityIds: string[],
  options?: { providerId?: IntegrationProviderId; enabled?: boolean }
): Record<string, PlatformEntitySnapshot | undefined> {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const resolvedProviderId = options?.providerId ?? currentProviderId;
  const resolvedEntityIds = useMemo(
    () => resolveUniqueRuntimeEntityIds(entityIds, resolvedProviderId),
    [entityIds, resolvedProviderId]
  );
  const runtimeService = getProviderRuntimeRegistration(resolvedProviderId).entityRuntimeService;
  const select = useMemo(
    () => (snapshots: PlatformEntitySnapshotMap | null) =>
      snapshots
        ? Object.fromEntries(resolvedEntityIds.map((id) => [id, snapshots[id]]))
        : EMPTY_ENTITY_SNAPSHOT_RECORD,
    [resolvedEntityIds]
  );
  return useRuntimeSelection(
    runtimeService?.subscribeEntitySnapshots ?? subscribeNoop,
    options?.enabled !== false && resolvedEntityIds.length > 0 && runtimeService
      ? runtimeService.getEntitySnapshots
      : null,
    select,
    EMPTY_ENTITY_SNAPSHOT_RECORD,
    areSnapshotRecordsEqual
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
