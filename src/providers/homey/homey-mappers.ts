import { createProviderScopedId } from '@navet/core/ids';
import type { NavetEntity, NavetProviderRoom } from '@navet/core/types';
import type { HomeyDevice, HomeySnapshot, HomeyZone } from '@/app/types/homey';
import { UNKNOWN_ROOM_LABEL } from '@/app/utils/device-location';

function normalizeRoomName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function buildProviderRoomMap(entities: NavetEntity[]): NavetProviderRoom[] {
  const roomMap = new Map<string, NavetProviderRoom>();

  for (const entity of entities) {
    const roomName = entity.room ?? UNKNOWN_ROOM_LABEL;
    const normalizedName = normalizeRoomName(roomName);
    const canonicalId = createProviderScopedId('homey', normalizedName);
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
      providerId: 'homey',
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
  const canonicalId = createProviderScopedId('homey', nativeId);

  return {
    id: canonicalId,
    canonicalId,
    providerId: 'homey',
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
    availability: state.available === false ? 'unavailable' : 'available',
    attributes: state,
    capabilities,
    lastUpdated: typeof state.lastUpdated === 'string' ? state.lastUpdated : undefined,
  };
}

function getCapabilityState(device: HomeyDevice, capabilityId: string) {
  return device.capabilitiesObj?.[capabilityId];
}

function resolveHomeyRoom(device: HomeyDevice, zones: Record<string, HomeyZone>) {
  const zoneId = typeof device.zone === 'string' && device.zone.length > 0 ? device.zone : null;
  return zoneId ? (zones[zoneId]?.name ?? UNKNOWN_ROOM_LABEL) : UNKNOWN_ROOM_LABEL;
}

function createHomeyState(device: HomeyDevice): Record<string, unknown> {
  return {
    available: device.available ?? true,
    on: getCapabilityState(device, 'onoff')?.value,
    dim: getCapabilityState(device, 'dim')?.value,
    lightTemperature: getCapabilityState(device, 'light_temperature')?.value,
  };
}

function inferHomeyCapabilities(device: HomeyDevice): NavetEntity['capabilities'] {
  const capabilities: NavetEntity['capabilities'] = [];
  const capabilityIds = new Set(device.capabilities ?? Object.keys(device.capabilitiesObj ?? {}));

  if (capabilityIds.has('onoff')) {
    capabilities.push('toggle');
  }
  if (capabilityIds.has('dim')) {
    capabilities.push(device.class === 'fan' ? 'fan_speed' : 'brightness');
  }
  if (capabilityIds.has('light_temperature')) {
    capabilities.push('color_temperature');
  }

  if (Array.from(capabilityIds).some((capabilityId) => capabilityId.startsWith('measure_'))) {
    capabilities.push('numeric_sensor');
  }

  return capabilities;
}

export function mapHomeySnapshotToNavetEntities(snapshot: HomeySnapshot): NavetEntity[] {
  const entities: NavetEntity[] = [];

  for (const device of Object.values(snapshot.devices)) {
    const room = resolveHomeyRoom(device, snapshot.zones);
    const capabilities = inferHomeyCapabilities(device);
    const baseState = createHomeyState(device);

    if (device.class === 'light') {
      entities.push(
        createNavetEntity(device.id, 'light', device.name, room, capabilities, baseState)
      );
      continue;
    }

    if (device.class === 'fan') {
      entities.push(
        createNavetEntity(device.id, 'fan', device.name, room, capabilities, baseState)
      );
      continue;
    }

    if (capabilities.includes('toggle')) {
      entities.push(
        createNavetEntity(device.id, 'switch', device.name, room, capabilities, baseState)
      );
    }

    for (const [capabilityId, capability] of Object.entries(device.capabilitiesObj ?? {})) {
      if (!capabilityId.startsWith('measure_') && !capabilityId.startsWith('alarm_')) {
        continue;
      }

      const nativeId = `${device.id}#${capabilityId}`;
      entities.push(
        createNavetEntity(
          nativeId,
          'sensor',
          capability.title ?? capabilityId,
          room,
          ['numeric_sensor'],
          {
            value: capability.value,
            unit: capability.units,
            sourceDeviceId: device.id,
            deviceClass: capabilityId.replace(/^(measure_|alarm_)/, ''),
          }
        )
      );
    }
  }

  return entities;
}

export function buildHomeyProviderRooms(snapshot: HomeySnapshot): NavetProviderRoom[] {
  return buildProviderRoomMap(mapHomeySnapshotToNavetEntities(snapshot));
}
