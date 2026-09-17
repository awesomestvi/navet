import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import type { ProviderEntityRuntimeService } from '@navet/core/provider-feature-services';
import type { NavetEntity } from '@navet/core/types';

export const EMPTY_ENTITY_SNAPSHOT_RECORD: Record<string, PlatformEntitySnapshot | undefined> = {};
export const EMPTY_ENTITY_SNAPSHOTS: PlatformEntitySnapshotMap = {};
export const EMPTY_ENTITY_REGISTRY: PlatformEntityRegistryEntry[] = [];
export const EMPTY_ENTITY_IDS: string[] = [];

function subscribeNoop() {
  return () => {};
}

function selectionsEqual<Value>(left: readonly Value[], right: readonly Value[]) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

interface RegistryIndex {
  byDevice: Map<string, PlatformEntityRegistryEntry[]>;
  byId: Map<string, PlatformEntityRegistryEntry>;
  selections: Map<string, PlatformEntityRegistryEntry[]>;
}

interface SnapshotIndex {
  prefixes: Map<string, PlatformEntitySnapshotMap>;
  records: Map<string, Record<string, PlatformEntitySnapshot | undefined>>;
}

const registryIndexes = new WeakMap<PlatformEntityRegistryEntry[], RegistryIndex>();
const snapshotIndexes = new WeakMap<PlatformEntitySnapshotMap, SnapshotIndex>();
const providerEntityPrefixIndexes = new WeakMap<
  Record<string, NavetEntity>,
  Map<string, string[]>
>();

function getRegistryIndex(entries: PlatformEntityRegistryEntry[]) {
  const cached = registryIndexes.get(entries);
  if (cached) return cached;
  const byId = new Map<string, PlatformEntityRegistryEntry>();
  const byDevice = new Map<string, PlatformEntityRegistryEntry[]>();
  for (const entry of entries) {
    byId.set(entry.entityId, entry);
    if (!entry.deviceId) continue;
    const siblings = byDevice.get(entry.deviceId);
    if (siblings) siblings.push(entry);
    else byDevice.set(entry.deviceId, [entry]);
  }
  for (const siblings of byDevice.values()) {
    siblings.sort((left, right) => left.entityId.localeCompare(right.entityId));
  }
  const index = { byDevice, byId, selections: new Map() };
  registryIndexes.set(entries, index);
  return index;
}

function getSnapshotIndex(snapshots: PlatformEntitySnapshotMap) {
  const cached = snapshotIndexes.get(snapshots);
  if (cached) return cached;
  const index: SnapshotIndex = { prefixes: new Map(), records: new Map() };
  snapshotIndexes.set(snapshots, index);
  return index;
}

export function resolveEntityProviderId(
  entityId: string,
  providerId: IntegrationProviderId | undefined,
  currentProviderId: IntegrationProviderId
) {
  return providerId ?? parseProviderScopedId(entityId)?.providerId ?? currentProviderId;
}

export function resolveProviderRuntimeEntityId(
  entityId: string,
  providerId: IntegrationProviderId | undefined
) {
  if (!entityId || !providerId) return null;
  const scopedId = parseProviderScopedId(entityId);
  if (!scopedId) return entityId;
  return scopedId.providerId === providerId ? scopedId.nativeId : null;
}

export function resolveUniqueRuntimeEntityIds(
  entityIds: readonly string[],
  providerId: IntegrationProviderId | undefined
) {
  return [
    ...new Set(
      entityIds.map((entityId) => resolveProviderRuntimeEntityId(entityId, providerId) ?? entityId)
    ),
  ];
}

export function selectProviderEntityIdsByPrefixes(
  entities: Record<string, NavetEntity> | undefined,
  prefixes: readonly string[]
) {
  if (!entities || prefixes.length === 0) return EMPTY_ENTITY_IDS;
  const key = prefixes.join('\n');
  let selections = providerEntityPrefixIndexes.get(entities);
  if (!selections) {
    selections = new Map();
    providerEntityPrefixIndexes.set(entities, selections);
  }
  const cached = selections.get(key);
  if (cached) return cached;
  const ids = Object.values(entities)
    .map((entity) => entity.externalId)
    .filter(
      (entityId): entityId is string =>
        typeof entityId === 'string' && prefixes.some((prefix) => entityId.startsWith(prefix))
    )
    .sort((left, right) => left.localeCompare(right));
  selections.set(key, ids);
  return ids;
}

export class ProviderRuntimeQuery {
  constructor(readonly runtime: ProviderEntityRuntimeService | null) {}

  subscribeSnapshots = (listener: () => void) =>
    this.runtime?.subscribeEntitySnapshots(listener) ?? subscribeNoop();

  getSnapshots = () => this.runtime?.getEntitySnapshots() ?? null;

  subscribeRegistry = (listener: () => void) =>
    this.runtime?.subscribeEntityRegistryEntries(listener) ?? subscribeNoop();

  getRegistry = () => this.runtime?.getEntityRegistryEntries() ?? EMPTY_ENTITY_REGISTRY;

  subscribeConfig = (listener: () => void) =>
    this.runtime?.subscribeConfig(listener) ?? subscribeNoop();

  getConfig = () => this.runtime?.getConfig() ?? null;

  subscribeSnapshot(entityId: string, listener: () => void) {
    return (
      this.runtime?.subscribeEntitySnapshot?.(entityId, listener) ??
      this.subscribeSnapshots(listener)
    );
  }

  getSnapshot(entityId: string) {
    return this.runtime?.getEntitySnapshot?.(entityId) ?? this.getSnapshots()?.[entityId];
  }

  subscribeRegistryEntry(entityId: string, listener: () => void) {
    return (
      this.runtime?.subscribeEntityRegistryEntry?.(entityId, listener) ??
      this.subscribeRegistry(listener)
    );
  }

  getRegistryEntry(entityId: string) {
    return (
      this.runtime?.getEntityRegistryEntry?.(entityId) ??
      getRegistryIndex(this.getRegistry()).byId.get(entityId)
    );
  }

  selectSnapshotsByPrefixes(prefixes: readonly string[]) {
    const snapshots = this.getSnapshots();
    if (!snapshots || prefixes.length === 0) return EMPTY_ENTITY_SNAPSHOTS;
    const key = prefixes.join('\n');
    const index = getSnapshotIndex(snapshots);
    const cached = index.prefixes.get(key);
    if (cached) return cached;
    const selection = Object.fromEntries(
      Object.entries(snapshots).filter(([entityId]) =>
        prefixes.some((prefix) => entityId.startsWith(prefix))
      )
    );
    index.prefixes.set(key, selection);
    return selection;
  }

  selectRegistryByIds(entityIds: readonly string[]) {
    if (entityIds.length === 0) return EMPTY_ENTITY_REGISTRY;
    const entries = this.getRegistry();
    const index = getRegistryIndex(entries);
    const key = `ids\n${entityIds.join('\n')}`;
    const cached = index.selections.get(key);
    if (cached) return cached;
    const selection = entityIds
      .map((id) => index.byId.get(id))
      .filter((entry): entry is PlatformEntityRegistryEntry => entry !== undefined);
    index.selections.set(key, selection);
    return selection;
  }

  selectRegistryByDeviceId(deviceId: string | null) {
    if (!deviceId) return EMPTY_ENTITY_REGISTRY;
    return getRegistryIndex(this.getRegistry()).byDevice.get(deviceId) ?? EMPTY_ENTITY_REGISTRY;
  }

  selectSnapshotRecord(entityIds: readonly string[]) {
    const snapshots = this.getSnapshots();
    if (!snapshots || entityIds.length === 0) return EMPTY_ENTITY_SNAPSHOT_RECORD;
    const key = entityIds.join('\n');
    const index = getSnapshotIndex(snapshots);
    const cached = index.records.get(key);
    if (cached) return cached;
    const selection = Object.fromEntries(entityIds.map((id) => [id, snapshots[id]]));
    index.records.set(key, selection);
    return selection;
  }
}

const queryCache = new Map<
  IntegrationProviderId,
  { runtime: ProviderEntityRuntimeService | null; query: ProviderRuntimeQuery }
>();

export function getProviderRuntimeQuery(providerId: IntegrationProviderId | undefined) {
  if (!providerId) return new ProviderRuntimeQuery(null);
  let runtime: ProviderEntityRuntimeService | null = null;
  try {
    runtime = getProviderRuntimeRegistration(providerId).entityRuntimeService ?? null;
  } catch {
    // Startup and isolated unit tests can initialize selectors before registrations.
  }
  const cached = queryCache.get(providerId);
  if (cached?.runtime === runtime) return cached.query;
  const query = new ProviderRuntimeQuery(runtime);
  queryCache.set(providerId, { runtime, query });
  return query;
}

export function reuseSelection<Value>(previous: readonly Value[], next: readonly Value[]) {
  return selectionsEqual(previous, next) ? previous : next;
}
