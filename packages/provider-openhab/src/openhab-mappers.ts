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

function resolveItemRoom(item: OpenHABItem, items: Record<string, OpenHABItem>): string {
  const explicitLocation = getSemanticsConfig(item)?.hasLocation;
  if (explicitLocation) {
    const locationItem = items[explicitLocation];
    if (locationItem) {
      return locationItem.label?.trim() || locationItem.name;
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
      return resolveItemName(group, items);
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
          isLightItem(item, snapshot.items) ? 'light' : 'switch',
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
