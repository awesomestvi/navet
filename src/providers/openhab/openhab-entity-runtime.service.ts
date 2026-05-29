import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshotMap,
} from '@/app/platform/provider-feature-models';
import type { ProviderEntityRuntimeService } from '@/app/platform/provider-feature-services';
import type { OpenHABItem, OpenHABSnapshot } from '@/app/types/openhab';
import { openhabService } from './openhab-service';

const EMPTY_ENTITY_REGISTRY: PlatformEntityRegistryEntry[] = [];
let cachedEntitySnapshotSource: OpenHABSnapshot | null = null;
let cachedEntitySnapshots: PlatformEntitySnapshotMap | null = null;
let cachedEntityRegistrySource: OpenHABSnapshot | null = null;
let cachedEntityRegistry: PlatformEntityRegistryEntry[] = EMPTY_ENTITY_REGISTRY;

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

function toEntitySnapshots(snapshot: OpenHABSnapshot): PlatformEntitySnapshotMap {
  if (snapshot === cachedEntitySnapshotSource && cachedEntitySnapshots) {
    return cachedEntitySnapshots;
  }

  const entities: PlatformEntitySnapshotMap = {};

  for (const item of Object.values(snapshot.items)) {
    entities[item.name] = {
      entityId: item.name,
      state: item.state ?? 'UNDEF',
      attributes: {
        friendly_name: item.label ?? item.name,
        category: item.category ?? undefined,
        item_type: item.type ?? undefined,
        tags: item.tags ?? [],
        group_names: item.groupNames ?? [],
        room: resolveItemRoom(item, snapshot.items),
      },
    };
  }

  cachedEntitySnapshotSource = snapshot;
  cachedEntitySnapshots = entities;
  return entities;
}

function toEntityRegistryEntries(snapshot: OpenHABSnapshot): PlatformEntityRegistryEntry[] {
  if (snapshot === cachedEntityRegistrySource && cachedEntityRegistry !== EMPTY_ENTITY_REGISTRY) {
    return cachedEntityRegistry;
  }

  const entries = Object.values(snapshot.items).map((item) => ({
    entityId: item.name,
    deviceId: null,
    areaId: null,
    name: item.label ?? item.name,
    platform: 'openhab',
  }));

  cachedEntityRegistrySource = snapshot;
  cachedEntityRegistry = entries;
  return entries;
}

export const openhabEntityRuntimeService: ProviderEntityRuntimeService = {
  getEntitySnapshots: () => toEntitySnapshots(openhabService.getSnapshot()),
  subscribeEntitySnapshots: (listener) => openhabService.subscribe(() => listener()),
  getEntityRegistryEntries: () => {
    const snapshot = openhabService.getSnapshot();
    return Object.keys(snapshot.items).length > 0
      ? toEntityRegistryEntries(snapshot)
      : EMPTY_ENTITY_REGISTRY;
  },
  subscribeEntityRegistryEntries: (listener) => openhabService.subscribe(() => listener()),
  getConfig: () => null,
  subscribeConfig: () => () => {},
};
