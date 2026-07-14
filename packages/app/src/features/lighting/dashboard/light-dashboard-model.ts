import type { DeviceWithType } from '@navet/app/types/device.types';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { getDeviceRoomLabel, UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import type { NavetEntity } from '@navet/core/types';

export interface LightDashboardItem {
  id: string;
  providerId?: IntegrationProviderId;
  name: string;
  room: string;
  isOn: boolean;
  available: boolean;
  brightness?: number;
  colorTemperatureKelvin?: number;
  lastUpdated?: string;
  supportsBrightness: boolean;
  supportsColorTemperature: boolean;
  supportsToggle: boolean;
}

export interface LightRoomSummary {
  room: string;
  lights: LightDashboardItem[];
  totalCount: number;
  activeCount: number;
  unavailableCount: number;
  dimmableCount: number;
  averageBrightness?: number;
}

export interface LightDashboardModel {
  rooms: LightRoomSummary[];
  totalCount: number;
  activeCount: number;
  activeRoomCount: number;
  unavailableCount: number;
}

function clampBrightness(value: unknown): number | undefined {
  if (typeof value !== 'number' || !Number.isFinite(value)) return undefined;
  return Math.min(100, Math.max(0, Math.round(value)));
}

function findEntity(
  device: DeviceWithType,
  entityLookup: Map<string, NavetEntity>
): NavetEntity | undefined {
  return (
    (device.canonicalId ? entityLookup.get(device.canonicalId) : undefined) ??
    entityLookup.get(device.id) ??
    (device.nativeId ? entityLookup.get(device.nativeId) : undefined)
  );
}

function areItemsEqual(left: LightDashboardItem, right: LightDashboardItem): boolean {
  return (
    left.id === right.id &&
    left.providerId === right.providerId &&
    left.name === right.name &&
    left.room === right.room &&
    left.isOn === right.isOn &&
    left.available === right.available &&
    left.brightness === right.brightness &&
    left.colorTemperatureKelvin === right.colorTemperatureKelvin &&
    left.lastUpdated === right.lastUpdated &&
    left.supportsBrightness === right.supportsBrightness &&
    left.supportsColorTemperature === right.supportsColorTemperature &&
    left.supportsToggle === right.supportsToggle
  );
}

function summarizeRoom(room: string, lights: LightDashboardItem[]): LightRoomSummary {
  let activeCount = 0;
  let unavailableCount = 0;
  let dimmableCount = 0;
  let brightnessTotal = 0;
  let brightnessCount = 0;

  for (const light of lights) {
    if (!light.available) {
      unavailableCount++;
      continue;
    }
    if (light.supportsBrightness) dimmableCount++;
    if (!light.isOn) continue;
    activeCount++;
    if (light.supportsBrightness && typeof light.brightness === 'number') {
      brightnessTotal += light.brightness;
      brightnessCount++;
    }
  }

  return {
    room,
    lights,
    totalCount: lights.length,
    activeCount,
    unavailableCount,
    dimmableCount,
    averageBrightness:
      brightnessCount > 0 ? Math.round(brightnessTotal / brightnessCount) : undefined,
  };
}

function areRoomSummariesEqual(left: LightRoomSummary, right: LightRoomSummary): boolean {
  return (
    left.room === right.room &&
    left.totalCount === right.totalCount &&
    left.activeCount === right.activeCount &&
    left.unavailableCount === right.unavailableCount &&
    left.dimmableCount === right.dimmableCount &&
    left.averageBrightness === right.averageBrightness &&
    left.lights.length === right.lights.length &&
    left.lights.every((light, index) => light === right.lights[index])
  );
}

export function buildLightDashboardModel({
  deviceMap,
  entities,
  rooms,
  cardOrders,
  previous,
}: {
  deviceMap: Map<string, DeviceWithType>;
  entities: Record<string, NavetEntity>;
  rooms: string[];
  cardOrders: Record<string, string[]>;
  previous?: LightDashboardModel;
}): LightDashboardModel {
  const previousItems = new Map(
    previous?.rooms.flatMap((room) => room.lights.map((light) => [light.id, light] as const)) ?? []
  );
  const entityLookup = new Map<string, NavetEntity>();
  for (const [key, entity] of Object.entries(entities)) {
    entityLookup.set(key, entity);
    entityLookup.set(entity.id, entity);
    entityLookup.set(entity.canonicalId, entity);
    entityLookup.set(entity.externalId, entity);
  }
  const itemsByRoom = new Map<string, LightDashboardItem[]>();

  for (const device of deviceMap.values()) {
    if (device.type !== 'lights') continue;
    const entity = findEntity(device, entityLookup);
    const room = getDeviceRoomLabel(device) || UNKNOWN_ROOM_LABEL;
    const attributes = entity?.attributes ?? {};
    const brightness = clampBrightness(attributes.brightnessPct ?? device.brightness);
    const next: LightDashboardItem = {
      id: device.id,
      providerId: entity?.providerId ?? device.providerId,
      name: entity?.name ?? device.name,
      room,
      isOn: entity ? entity.primaryState === 'on' || entity.primaryState === true : device.state,
      available: entity ? entity.availability === 'available' : true,
      brightness,
      colorTemperatureKelvin:
        typeof attributes.colorTemperatureKelvin === 'number'
          ? Math.round(attributes.colorTemperatureKelvin)
          : undefined,
      lastUpdated: entity?.lastUpdated,
      supportsBrightness:
        entity?.capabilities.includes('brightness') ?? typeof brightness === 'number',
      supportsColorTemperature:
        entity?.capabilities.includes('color_temperature') ??
        typeof attributes.colorTemperatureKelvin === 'number',
      supportsToggle: entity?.capabilities.includes('toggle') ?? true,
    };
    const previousItem = previousItems.get(next.id);
    const item = previousItem && areItemsEqual(previousItem, next) ? previousItem : next;
    const roomItems = itemsByRoom.get(room) ?? [];
    roomItems.push(item);
    itemsByRoom.set(room, roomItems);
  }

  const knownRooms = rooms.filter((room) => itemsByRoom.has(room));
  const extraRooms = Array.from(itemsByRoom.keys()).filter((room) => !knownRooms.includes(room));
  const orderedRooms = [...knownRooms, ...extraRooms];
  const previousRooms = new Map(previous?.rooms.map((room) => [room.room, room]) ?? []);
  const summaries = orderedRooms.map((room) => {
    const items = itemsByRoom.get(room) ?? [];
    const configuredOrder = cardOrders[room] ?? [];
    const orderIndex = new Map(configuredOrder.map((id, index) => [id, index]));
    items.sort((left, right) => {
      const leftOrder = orderIndex.get(left.id) ?? Number.MAX_SAFE_INTEGER;
      const rightOrder = orderIndex.get(right.id) ?? Number.MAX_SAFE_INTEGER;
      return leftOrder - rightOrder;
    });
    const summary = summarizeRoom(room, items);
    const previousRoom = previousRooms.get(room);
    return previousRoom && areRoomSummariesEqual(previousRoom, summary) ? previousRoom : summary;
  });

  let totalCount = 0;
  let activeCount = 0;
  let activeRoomCount = 0;
  let unavailableCount = 0;
  for (const room of summaries) {
    totalCount += room.totalCount;
    activeCount += room.activeCount;
    unavailableCount += room.unavailableCount;
    if (room.activeCount > 0) activeRoomCount++;
  }

  return { rooms: summaries, totalCount, activeCount, activeRoomCount, unavailableCount };
}
