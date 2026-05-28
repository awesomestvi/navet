import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from '@/app/services/home-assistant.service';
import type { HomeyDevice, HomeySnapshot, HomeyZone } from '@/app/types/homey';
import type { IntegrationProviderId } from '@/app/types/provider';
import { UNKNOWN_ROOM_LABEL } from '@/app/utils/device-location';
import { createProviderScopedId } from '@/app/utils/provider-ids';
import { getName, resolveEntityRoom } from '../hooks/ha-entity-utils';
import { createRegistryMaps, getEntityCategory } from '../hooks/use-ha-devices.helpers';
import type { NavetCapability, NavetDevice, NavetRoom } from './navet';

function normalizeRoomName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function buildNavetRoomMap(devices: NavetDevice[], providerId: IntegrationProviderId): NavetRoom[] {
  const roomMap = new Map<string, NavetRoom>();

  for (const device of devices) {
    const normalizedName = normalizeRoomName(device.room);
    const canonicalId = createProviderScopedId(providerId, normalizedName);
    const existing = roomMap.get(canonicalId);

    if (existing) {
      if (!existing.memberIds.includes(device.canonicalId)) {
        existing.memberIds.push(device.canonicalId);
      }
      continue;
    }

    roomMap.set(canonicalId, {
      id: canonicalId,
      canonicalId,
      providerId,
      nativeId: normalizedName,
      name: device.room,
      normalizedName,
      memberIds: [device.canonicalId],
    });
  }

  return Array.from(roomMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}

function getDomain(entityId: string): string {
  const separatorIndex = entityId.indexOf('.');
  return separatorIndex === -1 ? entityId : entityId.slice(0, separatorIndex);
}

function createNavetDevice(
  providerId: IntegrationProviderId,
  nativeId: string,
  kind: NavetDevice['kind'],
  name: string,
  room: string,
  capabilities: NavetCapability[],
  state: Record<string, unknown>,
  resources?: NavetDevice['resources']
): NavetDevice {
  const canonicalId = createProviderScopedId(providerId, nativeId);

  return {
    id: canonicalId,
    canonicalId,
    providerId,
    nativeId,
    kind,
    name,
    room,
    capabilities,
    state,
    resources,
  };
}

function inferHomeAssistantCapabilities(entityId: string, entity: HassEntity): NavetCapability[] {
  const domain = getDomain(entityId);

  if (domain === 'light') {
    const capabilities: NavetCapability[] = ['toggle'];
    if (typeof entity.attributes?.brightness === 'number') {
      capabilities.push('brightness');
    }
    if (
      typeof entity.attributes?.color_temp_kelvin === 'number' ||
      typeof entity.attributes?.min_color_temp_kelvin === 'number' ||
      typeof entity.attributes?.max_color_temp_kelvin === 'number'
    ) {
      capabilities.push('color_temperature');
    }
    return capabilities;
  }

  if (domain === 'fan') {
    const capabilities: NavetCapability[] = ['toggle'];
    if (typeof entity.attributes?.percentage === 'number') {
      capabilities.push('fan_speed');
    }
    return capabilities;
  }

  if (domain === 'switch' || domain === 'input_boolean') {
    return ['toggle'];
  }

  if (domain === 'sensor' || domain === 'binary_sensor') {
    return ['numeric_sensor'];
  }

  return [];
}

function createHomeAssistantState(entityId: string, entity: HassEntity): Record<string, unknown> {
  const domain = getDomain(entityId);

  return {
    value: entity.state,
    brightness: entity.attributes?.brightness,
    brightnessPct:
      typeof entity.attributes?.brightness === 'number'
        ? Math.round((entity.attributes.brightness / 255) * 100)
        : undefined,
    colorTemperatureKelvin: entity.attributes?.color_temp_kelvin,
    percentage: entity.attributes?.percentage,
    deviceClass: entity.attributes?.device_class,
    unit: entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement,
    lastChanged: entity.last_changed,
    lastUpdated: entity.last_updated,
    entityType: domain,
    serviceDomain:
      domain === 'input_boolean' ||
      domain === 'script' ||
      domain === 'button' ||
      domain === 'input_button'
        ? domain
        : undefined,
    serviceAction:
      domain === 'script'
        ? 'turn_on'
        : domain === 'button' || domain === 'input_button'
          ? 'press'
          : undefined,
  };
}

export function mapHomeAssistantEntitiesToNavetDevices(input: {
  entities: HassEntities | null;
  areas: HomeAssistantAreaRegistryEntry[];
  deviceRegistry: HomeAssistantDeviceRegistryEntry[];
  entityRegistry: HomeAssistantEntityRegistryEntry[];
}): NavetDevice[] {
  if (!input.entities) {
    return [];
  }

  const { areaMap, deviceRegistryMap, entityRegistryMap } = createRegistryMaps(
    input.areas,
    input.deviceRegistry,
    input.entityRegistry
  );

  const devices: NavetDevice[] = [];

  for (const [entityId, entity] of Object.entries(input.entities)) {
    const domain = getDomain(entityId);
    const entityEntry = entityRegistryMap.get(entityId);

    if (
      ![
        'light',
        'fan',
        'switch',
        'input_boolean',
        'script',
        'button',
        'input_button',
        'sensor',
        'binary_sensor',
      ].includes(domain)
    ) {
      continue;
    }

    if (getEntityCategory(entityEntry) === 'config') {
      continue;
    }

    const room = resolveEntityRoom(entityId, entity, areaMap, entityRegistryMap, deviceRegistryMap);
    const name = getName(entity, entityEntry);
    const capabilities = inferHomeAssistantCapabilities(entityId, entity);
    const kind =
      domain === 'input_boolean' ||
      domain === 'script' ||
      domain === 'button' ||
      domain === 'input_button'
        ? 'helper'
        : domain === 'binary_sensor'
          ? 'sensor'
          : (domain as NavetDevice['kind']);

    const resources =
      domain === 'camera' || typeof entity.attributes?.entity_picture === 'string'
        ? ({
            primary_image: {
              kind: 'primary_image' as const,
              providerId: 'home_assistant',
              entityId,
              path:
                typeof entity.attributes?.entity_picture === 'string'
                  ? entity.attributes.entity_picture
                  : undefined,
            },
          } satisfies NavetDevice['resources'])
        : undefined;

    devices.push(
      createNavetDevice(
        'home_assistant',
        entityId,
        kind,
        name,
        room,
        capabilities,
        createHomeAssistantState(entityId, entity),
        resources
      )
    );
  }

  return devices;
}

export function buildHomeAssistantNavetRooms(
  input: Parameters<typeof mapHomeAssistantEntitiesToNavetDevices>[0]
): NavetRoom[] {
  return buildNavetRoomMap(mapHomeAssistantEntitiesToNavetDevices(input), 'home_assistant');
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

function inferHomeyCapabilities(device: HomeyDevice): NavetCapability[] {
  const capabilities: NavetCapability[] = [];
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

export function mapHomeySnapshotToNavetDevices(snapshot: HomeySnapshot): NavetDevice[] {
  const devices: NavetDevice[] = [];

  for (const device of Object.values(snapshot.devices)) {
    const room = resolveHomeyRoom(device, snapshot.zones);
    const capabilities = inferHomeyCapabilities(device);
    const baseState = createHomeyState(device);

    if (device.class === 'light') {
      devices.push(
        createNavetDevice('homey', device.id, 'light', device.name, room, capabilities, baseState)
      );
      continue;
    }

    if (device.class === 'fan') {
      devices.push(
        createNavetDevice('homey', device.id, 'fan', device.name, room, capabilities, baseState)
      );
      continue;
    }

    if (capabilities.includes('toggle')) {
      devices.push(
        createNavetDevice('homey', device.id, 'switch', device.name, room, capabilities, baseState)
      );
    }

    for (const [capabilityId, capability] of Object.entries(device.capabilitiesObj ?? {})) {
      if (!capabilityId.startsWith('measure_') && !capabilityId.startsWith('alarm_')) {
        continue;
      }

      const nativeId = `${device.id}#${capabilityId}`;
      devices.push(
        createNavetDevice(
          'homey',
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

  return devices;
}

export function buildHomeyNavetRooms(snapshot: HomeySnapshot): NavetRoom[] {
  return buildNavetRoomMap(mapHomeySnapshotToNavetDevices(snapshot), 'homey');
}
