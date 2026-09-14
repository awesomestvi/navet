import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshot,
  PlatformEntitySnapshotMap,
} from '@navet/core/provider-feature-models';
import type { ProviderEntityRuntimeService } from '@navet/core/provider-feature-services';
import { areDataEqual } from '@navet/core/structural-equality';
import { openHABItemName } from './openhab-item-state';
import { mapOpenHABSnapshotToNavetEntities } from './openhab-mappers';
import { openhabService } from './openhab-service';
import type { OpenHABItem, OpenHABSnapshot } from './openhab-types';

const EMPTY_ENTITY_REGISTRY: PlatformEntityRegistryEntry[] = [];
let cachedEntitySnapshotSource: OpenHABSnapshot | null = null;
let cachedEntitySnapshots: PlatformEntitySnapshotMap | null = null;
let cachedEntityRegistrySource: OpenHABSnapshot | null = null;
let cachedEntityRegistry: PlatformEntityRegistryEntry[] = EMPTY_ENTITY_REGISTRY;
let cachedEntityRegistryById: Record<string, PlatformEntityRegistryEntry> = {};

function isSemanticLocation(item: OpenHABItem): boolean {
  return (item.tags ?? []).includes('Location');
}

function resolveItemRoom(
  item: OpenHABItem,
  items: Record<string, OpenHABItem>
): string | undefined {
  const queue = [...(item.groupNames ?? [])];
  const visited = new Set<string>();

  while (queue.length > 0) {
    const groupName = queue.shift();
    if (!groupName || visited.has(groupName)) {
      continue;
    }
    visited.add(groupName);

    const group = items[groupName];
    if (!group) {
      continue;
    }

    if (isSemanticLocation(group)) {
      return group.label ?? group.name;
    }

    queue.push(...(group.groupNames ?? []));
  }

  return undefined;
}

function parseNumberishState(state: string | undefined): number | null {
  if (typeof state !== 'string' || state.trim().length === 0) {
    return null;
  }

  const match = state.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return null;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : null;
}

function normalizeSwitchLikeState(state: string | undefined): string {
  switch (state) {
    case 'ON':
      return 'on';
    case 'OFF':
      return 'off';
    case 'OPEN':
      return 'open';
    case 'CLOSED':
      return 'closed';
    case 'LOCKED':
      return 'locked';
    case 'UNLOCKED':
      return 'unlocked';
    case 'NULL':
    case 'UNDEF':
    case undefined:
      return 'unknown';
    default:
      return state;
  }
}

function toRuntimeState(item: OpenHABItem): string {
  if (item.type === 'Dimmer' || item.type === 'Color') {
    const numericValue = parseNumberishState(item.state);
    if (typeof numericValue === 'number') {
      return numericValue > 0 ? 'on' : 'off';
    }
  }

  return normalizeSwitchLikeState(item.state);
}

function toEntitySnapshots(snapshot: OpenHABSnapshot): PlatformEntitySnapshotMap {
  if (snapshot === cachedEntitySnapshotSource && cachedEntitySnapshots) {
    return cachedEntitySnapshots;
  }

  const previousEntities = cachedEntitySnapshots;
  const entities: PlatformEntitySnapshotMap = {};
  const normalized = new Map(
    mapOpenHABSnapshotToNavetEntities(snapshot).map((entity) => [entity.externalId, entity])
  );

  for (const item of Object.values(snapshot.items)) {
    const numericValue = parseNumberishState(item.state);
    const mapped = normalized.get(item.name);
    const state = mapped?.attributes;
    const nextSnapshot = {
      entityId: item.name,
      state:
        mapped?.type === 'fan'
          ? mapped.attributes.on === true
            ? 'on'
            : mapped.primaryState === 'unknown'
              ? 'unknown'
              : 'off'
          : mapped?.type === 'binary_sensor' && typeof mapped.primaryState === 'boolean'
            ? mapped.primaryState
              ? 'on'
              : 'off'
            : mapped && mapped.type !== 'light' && mapped.primaryState !== null
              ? String(mapped.primaryState)
              : toRuntimeState(item),
      attributes: {
        ...state,
        friendly_name: mapped?.name ?? openHABItemName(item),
        unit_of_measurement: state?.unit,
        device_class: state?.deviceClass,
        temperature: state?.temperature,
        current_temperature: state?.currentTemperature,
        hvac_modes: state?.supportedClimateModes,
        temperature_unit: state?.temperatureUnit === 'fahrenheit' ? '°F' : '°C',
        current_position: state?.position,
        volume_level: typeof state?.volume === 'number' ? state.volume / 100 : undefined,
        supported_color_modes:
          state?.supportedColorModes ?? (item.type === 'Switch' ? ['onoff'] : undefined),
        hs_color: state?.hsColor,
        category: item.category ?? undefined,
        item_type: item.type ?? undefined,
        tags: item.tags ?? [],
        group_names: item.groupNames ?? [],
        room: mapped?.room ?? resolveItemRoom(item, snapshot.items),
        brightness_pct:
          (item.type === 'Dimmer' || item.type === 'Color') && typeof numericValue === 'number'
            ? (state?.brightnessPct ?? numericValue)
            : undefined,
      },
    } satisfies PlatformEntitySnapshot;
    const previousEntity = previousEntities?.[item.name];
    entities[item.name] =
      previousEntity && areDataEqual(previousEntity, nextSnapshot) ? previousEntity : nextSnapshot;
  }

  cachedEntitySnapshotSource = snapshot;
  cachedEntitySnapshots = entities;
  return entities;
}

function toEntityRegistryEntries(snapshot: OpenHABSnapshot): PlatformEntityRegistryEntry[] {
  if (snapshot === cachedEntityRegistrySource && cachedEntityRegistry !== EMPTY_ENTITY_REGISTRY) {
    return cachedEntityRegistry;
  }

  const previousSnapshot = cachedEntityRegistrySource;
  const previousEntriesById = cachedEntityRegistryById;
  const entries = Object.values(snapshot.items).map((item) => {
    const nextEntry = {
      entityId: item.name,
      deviceId: null,
      areaId: null,
      name: openHABItemName(item),
      platform: 'openhab',
    } satisfies PlatformEntityRegistryEntry;
    const previousItem = previousSnapshot?.items[item.name];
    const previousEntry = previousEntriesById[item.name];
    return previousItem &&
      previousEntry &&
      previousItem.label === item.label &&
      previousItem.name === item.name
      ? previousEntry
      : nextEntry;
  });

  cachedEntityRegistrySource = snapshot;
  cachedEntityRegistry = entries;
  cachedEntityRegistryById = Object.fromEntries(entries.map((entry) => [entry.entityId, entry]));
  return entries;
}

function subscribeOpenhabEntitySnapshot(entityId: string, listener: () => void) {
  let previousSnapshot = toEntitySnapshots(openhabService.getSnapshot())?.[entityId];

  return openhabService.subscribe(() => {
    const nextSnapshot = toEntitySnapshots(openhabService.getSnapshot())?.[entityId];
    if (nextSnapshot === previousSnapshot) {
      return;
    }

    previousSnapshot = nextSnapshot;
    listener();
  });
}

function subscribeOpenhabEntityRegistryEntry(entityId: string, listener: () => void) {
  const currentSnapshot = openhabService.getSnapshot();
  let previousEntry = getOpenhabEntityRegistryEntryFromSnapshot(currentSnapshot, entityId);

  return openhabService.subscribe(() => {
    const snapshot = openhabService.getSnapshot();
    const nextEntry = getOpenhabEntityRegistryEntryFromSnapshot(snapshot, entityId);
    if (nextEntry === previousEntry) {
      return;
    }

    previousEntry = nextEntry;
    listener();
  });
}

function getOpenhabEntityRegistryEntryFromSnapshot(snapshot: OpenHABSnapshot, entityId: string) {
  if (Object.keys(snapshot.items).length === 0) {
    return undefined;
  }

  toEntityRegistryEntries(snapshot);
  return cachedEntityRegistryById[entityId];
}

export const openhabEntityRuntimeService: ProviderEntityRuntimeService = {
  getEntitySnapshots: () => toEntitySnapshots(openhabService.getSnapshot()),
  subscribeEntitySnapshots: (listener) => openhabService.subscribe(() => listener()),
  getEntitySnapshot: (entityId) => toEntitySnapshots(openhabService.getSnapshot())?.[entityId],
  subscribeEntitySnapshot: (entityId, listener) =>
    subscribeOpenhabEntitySnapshot(entityId, listener),
  getEntityRegistryEntries: () => {
    const snapshot = openhabService.getSnapshot();
    return Object.keys(snapshot.items).length > 0
      ? toEntityRegistryEntries(snapshot)
      : EMPTY_ENTITY_REGISTRY;
  },
  subscribeEntityRegistryEntries: (listener) => openhabService.subscribe(() => listener()),
  getEntityRegistryEntry: (entityId) =>
    getOpenhabEntityRegistryEntryFromSnapshot(openhabService.getSnapshot(), entityId),
  subscribeEntityRegistryEntry: (entityId, listener) =>
    subscribeOpenhabEntityRegistryEntry(entityId, listener),
  getConfig: () => null,
  subscribeConfig: () => () => {},
};

export function resetOpenhabEntityRuntimeServiceCachesForTests() {
  cachedEntitySnapshotSource = null;
  cachedEntitySnapshots = null;
  cachedEntityRegistrySource = null;
  cachedEntityRegistry = EMPTY_ENTITY_REGISTRY;
  cachedEntityRegistryById = {};
}
