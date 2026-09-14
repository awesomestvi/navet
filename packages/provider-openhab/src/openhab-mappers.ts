import { createProviderScopedId } from '@navet/core/ids';
import type { NavetEntity, NavetProviderRoom } from '@navet/core/types';
import {
  openHABItemName,
  openHABNumber,
  openHABSecurityState,
  openHABSensorClass,
  openHABSourceId,
  openHABUnit,
  relatedOpenHABItem,
} from './openhab-item-state';
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
    availability:
      state.value === 'unknown' || state.status === 'unavailable' ? 'unknown' : 'available',
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
  return openHABItemName(resolveEquipmentItem(item, items) ?? item);
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
    (item.type === 'Dimmer' && !['fan', 'soundvolume'].includes(category)) ||
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
  if (item.stateDescription?.readOnly) return [];
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
  const color = item.type === 'Color' ? item.state?.split(',').map(Number) : undefined;
  const numericValue =
    color?.length === 3 && color.every(Number.isFinite) ? color[2] : openHABNumber(item);
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
      percentage: numericValue,
      supportedColorModes: item.type === 'Color' ? ['hs'] : ['brightness'],
      ...(color?.length === 3 && color.every(Number.isFinite)
        ? { hsColor: color.slice(0, 2) }
        : {}),
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
      // openHAB percentages describe closure; Navet percentages describe openness.
      ...(numericValue !== undefined ? { position: 100 - numericValue } : {}),
      hasPosition: numericValue !== undefined,
      positionMode: 'position',
      supportedFeatures: item.stateDescription?.readOnly ? 0 : 15,
      deviceClass:
        item.category?.includes('curtain') || /curtain/i.test(item.name) ? 'curtain' : 'blind',
      itemType: item.type,
      category: item.category ?? undefined,
      tags: item.tags ?? [],
    };
  }

  return {
    value:
      normalizedValue === 'unknown'
        ? normalizedValue
        : item.type?.startsWith('Number')
          ? (numericValue ?? normalizedValue)
          : normalizedValue,
    rawState: value,
    itemType: item.type,
    category: item.category ?? undefined,
    tags: item.tags ?? [],
  };
}

function measurementState(
  item: OpenHABItem,
  items: Record<string, OpenHABItem>
): Record<string, unknown> {
  const source = resolveEquipmentItem(item, items);
  const control = relatedOpenHABItem(
    item,
    items,
    (point) => point.type === 'Switch' && !(point.tags ?? []).includes('Status')
  );
  return {
    unit: openHABUnit(item),
    deviceClass: openHABSensorClass(item),
    sourceDeviceId: openHABSourceId(item),
    sourceDeviceName: source
      ? openHABItemName(source)
      : control
        ? openHABItemName(control)
        : openHABItemName(item).replace(
            /\s+(battery|temperature|humidity|pressure|power|energy)$/i,
            ''
          ),
    retainSensorCard: true,
    ...openHABSecurityState(item),
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
    const state: Record<string, unknown> = {
      ...createOpenHABState(item),
      ...(typeof item.lastStateUpdate === 'number' && Number.isFinite(item.lastStateUpdate)
        ? { lastUpdated: new Date(item.lastStateUpdate).toISOString() }
        : {}),
    };
    const name = resolveItemName(item, snapshot.items);

    if (isLockItem(item)) {
      const locked =
        state.value === 'on' || state.value === 'locked'
          ? true
          : state.value === 'off' || state.value === 'unlocked'
            ? false
            : undefined;
      entities.push(
        createNavetEntity(item.name, 'lock', name, room.name, room.roomId, capabilities, {
          ...state,
          value: locked === undefined ? 'unknown' : locked ? 'locked' : 'unlocked',
          locked,
        })
      );
      continue;
    }

    if (
      item.type?.startsWith('Number') &&
      (item.tags ?? []).includes('Setpoint') &&
      openHABSensorClass(item) === 'temperature'
    ) {
      const current = relatedOpenHABItem(
        item,
        snapshot.items,
        (point) => point.type === 'Number:Temperature' && !(point.tags ?? []).includes('Setpoint')
      );
      const target = openHABNumber(item);
      entities.push(
        createNavetEntity(
          item.name,
          'climate',
          name.replace(/\s+target temperature$/i, ''),
          room.name,
          room.roomId,
          item.stateDescription?.readOnly ? [] : ['temperature_setpoint'],
          {
            ...state,
            value: target === undefined ? 'unknown' : 'auto',
            mode: 'auto',
            temperature: target,
            currentTemperature: current ? openHABNumber(current) : undefined,
            hasCurrentTemperature: current ? openHABNumber(current) !== undefined : false,
            temperatureUnit: openHABUnit(item).includes('F') ? 'fahrenheit' : 'celsius',
            supportedClimateModes: [],
            serviceDomain: 'climate',
            temperatureStep: 0.1,
          }
        )
      );
      continue;
    }

    if (item.category?.toLowerCase() === 'fan' && item.type === 'Dimmer') {
      entities.push(
        createNavetEntity(
          item.name,
          'fan',
          name,
          room.name,
          room.roomId,
          item.stateDescription?.readOnly ? [] : ['toggle', 'fan_speed'],
          state
        )
      );
      continue;
    }

    if (item.type === 'String' && item.category?.toLowerCase() === 'soundvolume') {
      const volume = relatedOpenHABItem(
        item,
        snapshot.items,
        (point) => point.type === 'Dimmer' && point.category?.toLowerCase() === 'soundvolume'
      );
      const writable = item.stateDescription?.readOnly !== true;
      entities.push(
        createNavetEntity(
          item.name,
          'media_player',
          name.replace(/\s+state$/i, ''),
          room.name,
          room.roomId,
          ['media_playback'],
          {
            ...state,
            value: state.value === 'unknown' ? 'unknown' : (item.state ?? 'unknown').toLowerCase(),
            volume: volume ? openHABNumber(volume) : undefined,
            volumeItemId: volume?.name,
            entityType: 'Speaker',
            deviceClass: 'speaker',
            supportsGrouping: false,
            supportsPreviousTrack: false,
            supportsNextTrack: false,
            mediaCapabilities: {
              canPlay: writable,
              canPause: writable,
              canSetVolume: Boolean(volume && volume.stateDescription?.readOnly !== true),
              canBrowseMedia: false,
              canGroup: false,
              canMuteVolume: false,
              canNextTrack: false,
              canPreviousTrack: false,
              canStop: false,
              canTurnOn: false,
              canTurnOff: false,
            },
          }
        )
      );
      continue;
    }

    const security = openHABSecurityState(item);
    if (item.type === 'Contact' || security.entityType === 'binary_sensor') {
      entities.push(
        createNavetEntity(
          item.name,
          'binary_sensor',
          openHABItemName(item),
          room.name,
          room.roomId,
          ['numeric_sensor'],
          { ...state, ...measurementState(item, snapshot.items) }
        )
      );
      continue;
    }

    if (item.type === 'Dimmer' && item.category?.toLowerCase() === 'soundvolume') {
      entities.push(
        createNavetEntity(
          item.name,
          'sensor',
          openHABItemName(item),
          room.name,
          room.roomId,
          ['numeric_sensor'],
          {
            ...state,
            value: openHABNumber(item) ?? 'unknown',
            unit: '%',
            deviceClass: 'volume',
            retainSensorCard: true,
          }
        )
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
      const metrics = Object.values(snapshot.items).flatMap((point) => {
        if (
          typeof point.name !== 'string' ||
          openHABSourceId(point) !== openHABSourceId(item) ||
          !point.type?.startsWith('Number')
        )
          return [];
        const deviceClass = openHABSensorClass(point);
        const value = openHABNumber(point);
        if (
          value === undefined ||
          !['power', 'energy', 'voltage', 'current'].includes(deviceClass ?? '')
        )
          return [];
        return [
          {
            label: openHABItemName(point),
            value,
            unit: openHABUnit(point),
            icon: 'zap',
            category: 'measurement',
          },
        ];
      });
      entities.push(
        createNavetEntity(
          item.name,
          isLightItem(item, snapshot.items) ? 'light' : 'switch',
          name,
          room.name,
          room.roomId,
          capabilities,
          { ...state, metrics }
        )
      );
      continue;
    }

    if (
      item.type === 'String' ||
      item.type === 'DateTime' ||
      (typeof item.type === 'string' && item.type.startsWith('Number'))
    ) {
      entities.push(
        createNavetEntity(
          item.name,
          'sensor',
          openHABItemName(item),
          room.name,
          room.roomId,
          capabilities,
          { ...state, ...measurementState(item, snapshot.items) }
        )
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
