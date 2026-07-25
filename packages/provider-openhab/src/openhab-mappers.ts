import { createProviderScopedId } from '@navet/core/ids';
import type { NavetEntity, NavetProviderRoom } from '@navet/core/types';
import type { OpenHABItem, OpenHABSnapshot } from './openhab-types';

const UNKNOWN_ROOM_LABEL = 'Unassigned';

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

function createNavetEntity(
  nativeId: string,
  type: NavetEntity['type'],
  name: string,
  room: string,
  roomId: string | undefined,
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
    roomId,
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

function getSemanticsValue(item: OpenHABItem): string | undefined {
  return item.metadata?.semantics?.value;
}

function getSemanticsConfig(item: OpenHABItem) {
  return item.metadata?.semantics?.config;
}

function resolveEquipmentItem(
  item: OpenHABItem,
  items: Record<string, OpenHABItem>
): OpenHABItem | undefined {
  const pointOf = getSemanticsConfig(item)?.isPointOf;
  return pointOf ? items[pointOf] : undefined;
}

function resolveItemName(item: OpenHABItem, items: Record<string, OpenHABItem>): string {
  return resolveEquipmentItem(item, items)?.label?.trim() || item.label?.trim() || item.name;
}

function isEquipmentLightItem(item: OpenHABItem, items: Record<string, OpenHABItem>): boolean {
  const semanticsValue = getSemanticsValue(resolveEquipmentItem(item, items) ?? item);
  return typeof semanticsValue === 'string' && semanticsValue.includes('LightSource');
}

function isLightItem(item: OpenHABItem, items: Record<string, OpenHABItem>): boolean {
  const tags = new Set(item.tags ?? []);
  const category = item.category?.toLowerCase() ?? '';
  return (
    isEquipmentLightItem(item, items) ||
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

function resolveItemRoom(
  item: OpenHABItem,
  items: Record<string, OpenHABItem>
): { name: string; roomId?: string } {
  const explicitLocation = getSemanticsConfig(item)?.hasLocation;
  if (explicitLocation) {
    const locationItem = items[explicitLocation];
    if (locationItem) {
      return {
        name: locationItem.label?.trim() || locationItem.name,
        roomId: createProviderScopedId('openhab', locationItem.name),
      };
    }
  }

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
      return {
        name: resolveItemName(group, items),
        roomId: createProviderScopedId('openhab', group.name),
      };
    }

    queue.push(...(group.groupNames ?? []));
  }

  return { name: UNKNOWN_ROOM_LABEL };
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

function normalizeOpenHABStateValue(value: string): string {
  switch (value) {
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
    default:
      return value;
  }
}

function inferOpenHABCapabilities(item: OpenHABItem): NavetEntity['capabilities'] {
  if (item.type === 'Switch') {
    return isLockItem(item) ? ['lock'] : ['toggle'];
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

function shouldSkipAuxiliaryControlPoint(
  item: OpenHABItem,
  items: Record<string, OpenHABItem>
): boolean {
  const semanticsConfig = getSemanticsConfig(item);
  if (!semanticsConfig?.isPointOf) {
    return false;
  }

  if (!isLightItem(item, items)) {
    return false;
  }

  return semanticsConfig.relatesTo === 'Property_ColorTemperature';
}

function createOpenHABState(item: OpenHABItem): Record<string, unknown> {
  const value = item.state ?? 'UNDEF';
  const normalizedValue =
    value === 'UNDEF' || value === 'NULL' ? 'unknown' : normalizeOpenHABStateValue(value);
  const numericValue = parseNumberishState(item.state);
  const equipmentItemName = getSemanticsConfig(item)?.isPointOf;

  if (item.type === 'Dimmer' || item.type === 'Color') {
    const isOn =
      normalizedValue === 'on' ||
      (typeof numericValue === 'number'
        ? numericValue > 0
        : normalizedValue !== 'off' && normalizedValue !== 'unknown');

    return {
      value: normalizedValue,
      on: isOn,
      brightnessPct: numericValue,
      itemType: item.type,
      category: item.category ?? undefined,
      tags: item.tags ?? [],
      deviceId: equipmentItemName,
      sourceDeviceId: equipmentItemName,
    };
  }

  if (item.type === 'Switch') {
    return {
      value: normalizedValue,
      on: normalizedValue === 'on',
      locked: normalizedValue === 'locked' || normalizedValue === 'on',
      itemType: item.type,
      category: item.category ?? undefined,
      tags: item.tags ?? [],
      deviceId: equipmentItemName,
      sourceDeviceId: equipmentItemName,
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
    if (!item.name || isGroupItem(item) || shouldSkipAuxiliaryControlPoint(item, snapshot.items)) {
      continue;
    }

    const room = resolveItemRoom(item, snapshot.items);
    const capabilities = inferOpenHABCapabilities(item);
    const state = createOpenHABState(item);
    const name = resolveItemName(item, snapshot.items);

    if (isLockItem(item)) {
      entities.push(
        createNavetEntity(item.name, 'lock', name, room.name, room.roomId, ['lock'], state)
      );
      continue;
    }

    if (item.type === 'Rollershutter') {
      entities.push(
        createNavetEntity(item.name, 'cover', name, room.name, room.roomId, capabilities, state)
      );
      continue;
    }

    if (item.type === 'Switch' || item.type === 'Dimmer' || item.type === 'Color') {
      entities.push(
        createNavetEntity(
          item.name,
          isLightItem(item, snapshot.items) ? 'light' : 'switch',
          name,
          room.name,
          room.roomId,
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
      entities.push(
        createNavetEntity(item.name, 'sensor', name, room.name, room.roomId, capabilities, state)
      );
    }
  }

  return entities;
}

export function buildOpenHABProviderRooms(snapshot: OpenHABSnapshot): NavetProviderRoom[] {
  const roomsById = new Map<string, NavetProviderRoom>();
  for (const entity of mapOpenHABSnapshotToNavetEntities(snapshot)) {
    if (!entity.roomId || !entity.room || entity.room === UNKNOWN_ROOM_LABEL) {
      continue;
    }
    const existing = roomsById.get(entity.roomId);
    if (existing) {
      existing.memberIds.push(entity.canonicalId);
      continue;
    }
    roomsById.set(entity.roomId, {
      id: entity.roomId,
      canonicalId: entity.roomId,
      providerId: 'openhab',
      externalId: entity.roomId.slice('openhab:'.length),
      name: entity.room,
      normalizedName: normalizeRoomName(entity.room),
      memberIds: [entity.canonicalId],
    });
  }

  return Array.from(roomsById.values()).sort((left, right) => left.name.localeCompare(right.name));
}
