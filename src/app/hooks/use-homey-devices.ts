import { useMemo, useSyncExternalStore } from 'react';
import { homeyService } from '../services/homey.service';
import type {
  DeviceCollection,
  FanDevice,
  LightDevice,
  SensorDevice,
  SwitchDevice,
} from '../types/device.types';
import type { HomeyCapabilityState, HomeyDevice, HomeySnapshot, HomeyZone } from '../types/homey';
import { UNKNOWN_ROOM_LABEL } from '../utils/device-location';
import { createProviderScopedMetadata } from '../utils/provider-ids';
import { createEmptyDeviceCollection } from './use-ha-devices.helpers';

const HOMEY_LIGHT_TEMPERATURE_MIN_KELVIN = 2700;
const HOMEY_LIGHT_TEMPERATURE_MAX_KELVIN = 6500;

function getCapabilityState(
  device: HomeyDevice,
  capabilityId: string
): HomeyCapabilityState | undefined {
  return device.capabilitiesObj?.[capabilityId];
}

function getNumericCapability(device: HomeyDevice, capabilityId: string): number | null {
  const value = getCapabilityState(device, capabilityId)?.value;
  return typeof value === 'number' && Number.isFinite(value) ? value : null;
}

function resolveHomeyRoom(device: HomeyDevice, zones: Record<string, HomeyZone>): string {
  const zoneId = typeof device.zone === 'string' && device.zone.length > 0 ? device.zone : null;
  return zoneId ? (zones[zoneId]?.name ?? UNKNOWN_ROOM_LABEL) : UNKNOWN_ROOM_LABEL;
}

function normalizeHomeyState(device: HomeyDevice): boolean {
  const onoff = getCapabilityState(device, 'onoff')?.value;
  if (typeof onoff === 'boolean') {
    return onoff;
  }

  const dim = getNumericCapability(device, 'dim');
  return dim !== null && dim > 0;
}

function normalizeHomeyLightTemperature(device: HomeyDevice): number {
  const capability = getCapabilityState(device, 'light_temperature');
  const value = capability?.value;
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    return 0;
  }

  const normalized = Math.min(1, Math.max(0, value));
  const minKelvin =
    typeof capability?.min === 'number' && Number.isFinite(capability.min)
      ? capability.min
      : HOMEY_LIGHT_TEMPERATURE_MIN_KELVIN;
  const maxKelvin =
    typeof capability?.max === 'number' && Number.isFinite(capability.max)
      ? capability.max
      : HOMEY_LIGHT_TEMPERATURE_MAX_KELVIN;

  if (minKelvin >= maxKelvin) {
    return HOMEY_LIGHT_TEMPERATURE_MIN_KELVIN;
  }

  return Math.round((minKelvin + normalized * (maxKelvin - minKelvin)) / 100) * 100;
}

function mapHomeyLight(device: HomeyDevice, room: string): LightDevice {
  const dim = getNumericCapability(device, 'dim');
  const metadata = createProviderScopedMetadata('homey', device.id);

  return {
    id: metadata.canonicalId,
    name: device.name,
    room,
    size: 'small',
    state: normalizeHomeyState(device),
    brightness: Math.round((dim ?? 1) * 100),
    temp: normalizeHomeyLightTemperature(device),
    ...metadata,
  };
}

function mapHomeyFan(device: HomeyDevice, room: string): FanDevice {
  const dim = getNumericCapability(device, 'dim');
  const metadata = createProviderScopedMetadata('homey', device.id);

  return {
    id: metadata.canonicalId,
    name: device.name,
    room,
    size: 'small',
    state: normalizeHomeyState(device),
    percentage: Math.round((dim ?? 0) * 100),
    ...metadata,
  };
}

function mapHomeySwitch(device: HomeyDevice, room: string): SwitchDevice {
  const metadata = createProviderScopedMetadata('homey', device.id);

  return {
    id: metadata.canonicalId,
    name: device.name,
    room,
    size: 'small',
    state: normalizeHomeyState(device),
    ...metadata,
  };
}

function inferSensorIcon(capabilityId: string): SensorDevice['icon'] {
  if (capabilityId.includes('temperature')) return 'thermometer';
  if (capabilityId.includes('humidity')) return 'droplets';
  if (capabilityId.includes('motion')) return 'motion';
  if (capabilityId.includes('door') || capabilityId.includes('window')) return 'door';
  if (capabilityId.includes('battery')) return 'zap';
  return undefined;
}

function inferSensorStatus(_capabilityId: string, value: unknown): SensorDevice['status'] {
  if (typeof value === 'boolean') {
    return value ? 'active' : 'clear';
  }

  if (value === 'unknown' || value === 'unavailable') {
    return 'unavailable';
  }

  return 'measurement';
}

function createHomeySensorDevice(
  device: HomeyDevice,
  room: string,
  capabilityId: string,
  capability: HomeyCapabilityState
): SensorDevice {
  const metadata = createProviderScopedMetadata('homey', `${device.id}#${capabilityId}`);
  const value =
    typeof capability.value === 'boolean'
      ? capability.value
        ? 'Detected'
        : 'Clear'
      : String(capability.value ?? '');

  return {
    id: metadata.canonicalId,
    name: capability.title?.trim() || `${device.name} ${capabilityId.replace(/_/g, ' ')}`.trim(),
    room,
    size: 'small',
    value,
    unit: capability.units ?? '',
    icon: inferSensorIcon(capabilityId),
    deviceClass: capabilityId.replace(/^(measure_|alarm_)/, ''),
    status: inferSensorStatus(capabilityId, capability.value),
    ...metadata,
  };
}

function shouldMapHomeySensorCapability(capabilityId: string): boolean {
  return capabilityId.startsWith('measure_') || capabilityId.startsWith('alarm_');
}

function isHomeyLight(device: HomeyDevice): boolean {
  return device.class === 'light';
}

function isHomeyFan(device: HomeyDevice): boolean {
  return device.class === 'fan';
}

function isHomeySwitch(device: HomeyDevice): boolean {
  if (device.class === 'light' || device.class === 'fan') {
    return false;
  }

  return getCapabilityState(device, 'onoff') !== undefined;
}

function mapHomeySnapshot(snapshot: HomeySnapshot): DeviceCollection {
  const collection = createEmptyDeviceCollection();

  for (const device of Object.values(snapshot.devices)) {
    const room = resolveHomeyRoom(device, snapshot.zones);

    if (isHomeyLight(device)) {
      collection.lights.push(mapHomeyLight(device, room));
    } else if (isHomeyFan(device)) {
      collection.fans.push(mapHomeyFan(device, room));
    } else if (isHomeySwitch(device)) {
      collection.switches.push(mapHomeySwitch(device, room));
    }

    for (const [capabilityId, capability] of Object.entries(device.capabilitiesObj ?? {})) {
      if (!shouldMapHomeySensorCapability(capabilityId)) {
        continue;
      }

      collection.sensors.push(createHomeySensorDevice(device, room, capabilityId, capability));
    }
  }

  return collection;
}

export function useHomeyDevices(): DeviceCollection {
  const snapshot = useSyncExternalStore(
    (listener) => homeyService.subscribe(listener),
    () => homeyService.getSnapshot()
  );

  return useMemo(() => mapHomeySnapshot(snapshot), [snapshot]);
}
