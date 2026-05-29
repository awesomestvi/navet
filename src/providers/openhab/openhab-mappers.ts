import { createProviderScopedId } from '@navet/core/ids';
import type { NavetEntity, NavetProviderRoom } from '@navet/core/types';
import type { OpenHABItem, OpenHABSnapshot } from '@/app/types/openhab';
import { UNKNOWN_ROOM_LABEL } from '@/app/utils/device-location';

const LOCATION_TAGS = new Set([
  'Location',
  'Indoor',
  'Outdoor',
  'GroundFloor',
  'FirstFloor',
  'SecondFloor',
  'ThirdFloor',
  'Attic',
  'Basement',
  'Corridor',
  'Hallway',
  'Kitchen',
  'LivingRoom',
  'DiningRoom',
  'FamilyRoom',
  'Bedroom',
  'Bathroom',
  'Office',
  'Garage',
  'LaundryRoom',
  'Garden',
  'Terrace',
  'Balcony',
]);

function normalizeRoomName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function buildProviderRoomMap(entities: NavetEntity[]): NavetProviderRoom[] {
  const roomMap = new Map<string, NavetProviderRoom>();

  for (const entity of entities) {
    const roomName = entity.room ?? UNKNOWN_ROOM_LABEL;
    const normalizedName = normalizeRoomName(roomName);
    const canonicalId = createProviderScopedId('openhab', normalizedName);
    const existing = roomMap.get(canonicalId);

    if (existing) {
      if (!existing.memberIds.includes(entity.canonicalId)) {
        existing.memberIds.push(entity.canonicalId);
      }
      continue;
    }

    roomMap.set(canonicalId, {
      id: canonicalId,
      canonicalId,
      providerId: 'openhab',
      externalId: normalizedName,
      name: roomName,
      normalizedName,
      memberIds: [entity.canonicalId],
    });
  }

  return Array.from(roomMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function createNavetEntity(
  nativeId: string,
  type: NavetEntity['type'],
  name: string,
  room: string,
  capabilities: NavetEntity['capabilities'],
  state: Record<string, unknown>
): NavetEntity {
  const canonicalId = createProviderScopedId('openhab', nativeId);

  return {
    id: canonicalId,
    canonicalId,
    providerId: 'openhab',
    externalId: nativeId,
    type,
    name,
    room,
    primaryState:
      typeof state.value === 'string' ||
      typeof state.value === 'number' ||
      typeof state.value === 'boolean'
        ? state.value
        : null,
    availability: state.value === 'unknown' ? 'unknown' : 'available',
    attributes: state,
    capabilities,
    lastUpdated: typeof state.lastUpdated === 'string' ? state.lastUpdated : undefined,
  };
}

function isSemanticLocation(item: OpenHABItem): boolean {
  return (item.tags ?? []).some((tag) => LOCATION_TAGS.has(tag));
}

function isGroupItem(item: OpenHABItem): boolean {
  return typeof item.type === 'string' && item.type.startsWith('Group');
}

function resolveItemName(item: OpenHABItem): string {
  return item.label?.trim() || item.name;
}

function isLightItem(item: OpenHABItem): boolean {
  const tags = new Set(item.tags ?? []);
  const category = item.category?.toLowerCase() ?? '';
  return (
    tags.has('Light') ||
    tags.has('Lighting') ||
    category.includes('light') ||
    item.type === 'Dimmer' ||
    item.type === 'Color'
  );
}

function isLockItem(item: OpenHABItem): boolean {
  const tags = new Set(item.tags ?? []);
  const category = item.category?.toLowerCase() ?? '';
  return tags.has('Lock') || category.includes('lock');
}

function resolveItemRoom(item: OpenHABItem, items: Record<string, OpenHABItem>): string {
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
      return resolveItemName(group);
    }

    queue.push(...(group.groupNames ?? []));
  }

  return UNKNOWN_ROOM_LABEL;
}

function parseNumberishState(state: string | undefined): number | undefined {
  if (typeof state !== 'string' || state.trim().length === 0) {
    return undefined;
  }

  const match = state.match(/-?\d+(?:\.\d+)?/);
  if (!match) {
    return undefined;
  }

  const parsed = Number(match[0]);
  return Number.isFinite(parsed) ? parsed : undefined;
}

function inferOpenHABCapabilities(item: OpenHABItem): NavetEntity['capabilities'] {
  if (item.type === 'Switch') {
    return isLockItem(item) ? ['lock'] : isLightItem(item) ? ['toggle'] : ['toggle'];
  }

  if (item.type === 'Dimmer' || item.type === 'Color') {
    return ['toggle', 'brightness'];
  }

  if (item.type === 'Rollershutter') {
    return ['position'];
  }

  if (typeof item.type === 'string' && item.type.startsWith('Number')) {
    return ['numeric_sensor'];
  }

  if (item.type === 'Contact') {
    return ['numeric_sensor'];
  }

  return [];
}

function createOpenHABState(item: OpenHABItem): Record<string, unknown> {
  const value = item.state ?? 'UNDEF';
  const normalizedValue = value === 'UNDEF' || value === 'NULL' ? 'unknown' : value;
  const numericValue = parseNumberishState(item.state);

  if (item.type === 'Dimmer' || item.type === 'Color') {
    return {
      value: normalizedValue,
      on: normalizedValue !== 'OFF' && normalizedValue !== 'unknown',
      brightness: numericValue,
      itemType: item.type,
      category: item.category ?? undefined,
      tags: item.tags ?? [],
    };
  }

  if (item.type === 'Switch') {
    return {
      value: normalizedValue,
      on: normalizedValue === 'ON',
      locked: normalizedValue === 'LOCKED' || normalizedValue === 'ON',
      itemType: item.type,
      category: item.category ?? undefined,
      tags: item.tags ?? [],
    };
  }

  if (item.type === 'Rollershutter') {
    return {
      value: normalizedValue,
      position: numericValue,
      itemType: item.type,
      category: item.category ?? undefined,
      tags: item.tags ?? [],
    };
  }

  return {
    value: normalizedValue === 'unknown' ? normalizedValue : (numericValue ?? normalizedValue),
    rawState: value,
    itemType: item.type,
    category: item.category ?? undefined,
    tags: item.tags ?? [],
  };
}

export function mapOpenHABSnapshotToNavetEntities(snapshot: OpenHABSnapshot): NavetEntity[] {
  const entities: NavetEntity[] = [];

  for (const item of Object.values(snapshot.items)) {
    if (!item.name || isGroupItem(item)) {
      continue;
    }

    const room = resolveItemRoom(item, snapshot.items);
    const capabilities = inferOpenHABCapabilities(item);
    const state = createOpenHABState(item);
    const name = resolveItemName(item);

    if (isLockItem(item)) {
      entities.push(createNavetEntity(item.name, 'lock', name, room, ['lock'], state));
      continue;
    }

    if (item.type === 'Rollershutter') {
      entities.push(createNavetEntity(item.name, 'cover', name, room, capabilities, state));
      continue;
    }

    if (item.type === 'Switch' || item.type === 'Dimmer' || item.type === 'Color') {
      entities.push(
        createNavetEntity(
          item.name,
          isLightItem(item) ? 'light' : 'switch',
          name,
          room,
          capabilities,
          state
        )
      );
      continue;
    }

    if (
      item.type === 'Contact' ||
      (typeof item.type === 'string' && item.type.startsWith('Number'))
    ) {
      entities.push(createNavetEntity(item.name, 'sensor', name, room, capabilities, state));
    }
  }

  return entities;
}

export function buildOpenHABProviderRooms(snapshot: OpenHABSnapshot): NavetProviderRoom[] {
  return buildProviderRoomMap(mapOpenHABSnapshotToNavetEntities(snapshot));
}
