import { useMemo } from 'react';
import type { NavetDevice } from '@/app/core/navet';
import { integrationSelectors } from '../stores/selectors';
import type { DeviceCollection } from '../types/device.types';
import type { IntegrationProviderId } from '../types/provider';
import { getAllRooms } from '../utils/device-location';
import { useHADevices } from './use-ha-devices';
import { createEmptyDeviceCollection } from './use-ha-devices.helpers';
import { useHomeyDevices } from './use-homey-devices';
import { useIntegrationStore } from './use-integration-store';
import { useNavetDevices } from './use-navet-devices';
import { useProviderCalendarDevicesCollection } from './use-provider-calendar-devices';
import { useProviderWeatherDevicesCollection } from './use-provider-weather-devices';

export const useAggregatedDevices = (): DeviceCollection => {
  const navetDevices = useNavetDevices();
  const selectedProviderIds = useIntegrationStore(integrationSelectors.selectedProviderIds);
  const homeAssistantDevices = useHADevices();
  const homeyDevices = useHomeyDevices();
  const legacyDevices = useMemo(
    () => mergeDeviceCollections(homeAssistantDevices, homeyDevices),
    [homeAssistantDevices, homeyDevices]
  );

  return useMemo(
    () =>
      filterDeviceCollectionByProviders(
        mergeCanonicalAndLegacyDevices(navetDevices, legacyDevices),
        selectedProviderIds
      ),
    [legacyDevices, navetDevices, selectedProviderIds]
  );
};
export const useDevices = (): DeviceCollection => useAggregatedDevices();
export const useProviderDevices = (providerId: IntegrationProviderId): DeviceCollection => {
  const devices = useAggregatedDevices();

  return useMemo(
    () => filterDeviceCollectionByProvider(devices, providerId),
    [devices, providerId]
  );
};
export const useCalendarDevicesCollection = () => useProviderCalendarDevicesCollection();
export const useWeatherDevicesCollection = () => useProviderWeatherDevicesCollection();
export const useProviderCalendarCollections = useProviderCalendarDevicesCollection;
export const useProviderWeatherCollections = useProviderWeatherDevicesCollection;

export const useRooms = (devices: DeviceCollection): string[] =>
  useMemo(() => getAllRooms(devices), [devices]);

function getBooleanState(value: unknown): boolean {
  return value === true || value === 'on' || value === 'playing' || value === 'Detected';
}

function getNumberState(value: unknown): number {
  return typeof value === 'number' && Number.isFinite(value) ? value : 0;
}

function getStringState(value: unknown): string {
  return typeof value === 'string' ? value : '';
}

function mergeCanonicalAndLegacyDevices(
  navetDevices: NavetDevice[],
  legacyDevices: DeviceCollection
): DeviceCollection {
  const canonicalCollection = createEmptyDeviceCollection();

  const legacyLightsById = new Map(legacyDevices.lights.map((device) => [device.id, device]));
  const legacyFansById = new Map(legacyDevices.fans.map((device) => [device.id, device]));
  const legacySwitchesById = new Map(legacyDevices.switches.map((device) => [device.id, device]));
  const legacyHelpersById = new Map(legacyDevices.helpers.map((device) => [device.id, device]));
  const legacySensorsById = new Map(legacyDevices.sensors.map((device) => [device.id, device]));

  for (const device of navetDevices) {
    switch (device.kind) {
      case 'light': {
        const legacyDevice = legacyLightsById.get(device.canonicalId);
        canonicalCollection.lights.push({
          ...legacyDevice,
          id: device.canonicalId,
          name: device.name,
          room: device.room,
          size: legacyDevice?.size ?? 'small',
          state: getBooleanState(device.state.value),
          brightness: getNumberState(device.state.brightnessPct),
          temp: getNumberState(device.state.colorTemperatureKelvin),
          providerId: device.providerId,
          nativeId: device.nativeId,
          canonicalId: device.canonicalId,
          resources: device.resources
            ? {
                primaryImage: device.resources.primary_image,
                artwork: device.resources.media_artwork,
                snapshot: device.resources.camera_snapshot,
                stream: device.resources.camera_stream,
              }
            : legacyDevice?.resources,
        });
        break;
      }

      case 'fan': {
        const legacyDevice = legacyFansById.get(device.canonicalId);
        canonicalCollection.fans.push({
          ...legacyDevice,
          id: device.canonicalId,
          name: device.name,
          room: device.room,
          size: legacyDevice?.size ?? 'small',
          state: getBooleanState(device.state.value),
          percentage: getNumberState(device.state.percentage),
          providerId: device.providerId,
          nativeId: device.nativeId,
          canonicalId: device.canonicalId,
        });
        break;
      }

      case 'switch': {
        const legacyDevice = legacySwitchesById.get(device.canonicalId);
        canonicalCollection.switches.push({
          ...legacyDevice,
          id: device.canonicalId,
          name: device.name,
          room: device.room,
          size: legacyDevice?.size ?? 'small',
          state: getBooleanState(device.state.value ?? device.state.on),
          providerId: device.providerId,
          nativeId: device.nativeId,
          canonicalId: device.canonicalId,
          resources: device.resources
            ? {
                primaryImage: device.resources.primary_image,
                artwork: device.resources.media_artwork,
                snapshot: device.resources.camera_snapshot,
                stream: device.resources.camera_stream,
              }
            : legacyDevice?.resources,
        });
        break;
      }

      case 'helper': {
        const legacyDevice = legacyHelpersById.get(device.canonicalId);
        canonicalCollection.helpers.push({
          ...legacyDevice,
          id: device.canonicalId,
          name: device.name,
          room: device.room,
          size: legacyDevice?.size ?? 'small',
          state: getBooleanState(device.state.value),
          entityType:
            typeof device.state.entityType === 'string'
              ? device.state.entityType
              : legacyDevice?.entityType,
          serviceDomain:
            typeof device.state.serviceDomain === 'string'
              ? device.state.serviceDomain
              : legacyDevice?.serviceDomain,
          serviceAction:
            typeof device.state.serviceAction === 'string'
              ? device.state.serviceAction
              : legacyDevice?.serviceAction,
          providerId: device.providerId,
          nativeId: device.nativeId,
          canonicalId: device.canonicalId,
        });
        break;
      }

      case 'sensor': {
        const legacyDevice = legacySensorsById.get(device.canonicalId);
        const rawValue = device.state.value;
        canonicalCollection.sensors.push({
          ...legacyDevice,
          id: device.canonicalId,
          name: device.name,
          room: device.room,
          size: legacyDevice?.size ?? 'small',
          value:
            typeof rawValue === 'number'
              ? String(rawValue)
              : typeof rawValue === 'boolean'
                ? rawValue
                  ? 'Detected'
                  : 'Clear'
                : getStringState(rawValue),
          unit:
            typeof device.state.unit === 'string' ? device.state.unit : (legacyDevice?.unit ?? ''),
          deviceClass:
            typeof device.state.deviceClass === 'string'
              ? device.state.deviceClass
              : legacyDevice?.deviceClass,
          status:
            typeof rawValue === 'boolean'
              ? rawValue
                ? 'active'
                : 'clear'
              : rawValue === 'unknown' || rawValue === 'unavailable'
                ? 'unavailable'
                : (legacyDevice?.status ?? 'measurement'),
          providerId: device.providerId,
          nativeId: device.nativeId,
          canonicalId: device.canonicalId,
          resources: device.resources
            ? {
                primaryImage: device.resources.primary_image,
                artwork: device.resources.media_artwork,
                snapshot: device.resources.camera_snapshot,
                stream: device.resources.camera_stream,
              }
            : legacyDevice?.resources,
        });
        break;
      }
    }
  }

  return {
    ...legacyDevices,
    lights: mergeSupportedCategory(canonicalCollection.lights, legacyDevices.lights),
    fans: mergeSupportedCategory(canonicalCollection.fans, legacyDevices.fans),
    switches: mergeSupportedCategory(canonicalCollection.switches, legacyDevices.switches),
    helpers: mergeSupportedCategory(canonicalCollection.helpers, legacyDevices.helpers),
    sensors: mergeSupportedCategory(canonicalCollection.sensors, legacyDevices.sensors),
  };
}

function mergeSupportedCategory<T extends { id: string }>(
  canonicalDevices: T[],
  legacyDevices: T[]
) {
  const canonicalIds = new Set(canonicalDevices.map((device) => device.id));
  return [...canonicalDevices, ...legacyDevices.filter((device) => !canonicalIds.has(device.id))];
}

function filterDeviceCollectionByProviders(
  devices: DeviceCollection,
  providerIds: IntegrationProviderId[]
): DeviceCollection {
  const allowedProviderIds = new Set(providerIds);

  return {
    lights: devices.lights.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    fans: devices.fans.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    hvac: devices.hvac.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    climate: devices.climate.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    media: devices.media.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    weather: devices.weather.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    switches: devices.switches.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    helpers: devices.helpers.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    covers: devices.covers.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    locks: devices.locks.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    scenes: devices.scenes.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    persons: devices.persons.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    sensors: devices.sensors.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    vacuums: devices.vacuums.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    calendars: devices.calendars.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    cameras: devices.cameras.filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
    'grouped-sensors': devices['grouped-sensors'].filter(
      (device) => device.providerId && allowedProviderIds.has(device.providerId)
    ),
  };
}

export function mergeDeviceCollections(...collections: DeviceCollection[]): DeviceCollection {
  return collections.reduce<DeviceCollection>(
    (merged, collection) => ({
      lights: [...merged.lights, ...collection.lights],
      fans: [...merged.fans, ...collection.fans],
      hvac: [...merged.hvac, ...collection.hvac],
      climate: [...merged.climate, ...collection.climate],
      media: [...merged.media, ...collection.media],
      weather: [...merged.weather, ...collection.weather],
      switches: [...merged.switches, ...collection.switches],
      helpers: [...merged.helpers, ...collection.helpers],
      covers: [...merged.covers, ...collection.covers],
      locks: [...merged.locks, ...collection.locks],
      scenes: [...merged.scenes, ...collection.scenes],
      persons: [...merged.persons, ...collection.persons],
      sensors: [...merged.sensors, ...collection.sensors],
      vacuums: [...merged.vacuums, ...collection.vacuums],
      calendars: [...merged.calendars, ...collection.calendars],
      cameras: [...merged.cameras, ...collection.cameras],
      'grouped-sensors': [...merged['grouped-sensors'], ...collection['grouped-sensors']],
    }),
    {
      lights: [],
      fans: [],
      hvac: [],
      climate: [],
      media: [],
      weather: [],
      switches: [],
      helpers: [],
      covers: [],
      locks: [],
      scenes: [],
      persons: [],
      sensors: [],
      vacuums: [],
      calendars: [],
      cameras: [],
      'grouped-sensors': [],
    }
  );
}

export function filterDeviceCollectionByProvider(
  devices: DeviceCollection,
  providerId: IntegrationProviderId
): DeviceCollection {
  return {
    lights: devices.lights.filter((device) => device.providerId === providerId),
    fans: devices.fans.filter((device) => device.providerId === providerId),
    hvac: devices.hvac.filter((device) => device.providerId === providerId),
    climate: devices.climate.filter((device) => device.providerId === providerId),
    media: devices.media.filter((device) => device.providerId === providerId),
    weather: devices.weather.filter((device) => device.providerId === providerId),
    switches: devices.switches.filter((device) => device.providerId === providerId),
    helpers: devices.helpers.filter((device) => device.providerId === providerId),
    covers: devices.covers.filter((device) => device.providerId === providerId),
    locks: devices.locks.filter((device) => device.providerId === providerId),
    scenes: devices.scenes.filter((device) => device.providerId === providerId),
    persons: devices.persons.filter((device) => device.providerId === providerId),
    sensors: devices.sensors.filter((device) => device.providerId === providerId),
    vacuums: devices.vacuums.filter((device) => device.providerId === providerId),
    calendars: devices.calendars.filter((device) => device.providerId === providerId),
    cameras: devices.cameras.filter((device) => device.providerId === providerId),
    'grouped-sensors': devices['grouped-sensors'].filter(
      (device) => device.providerId === providerId
    ),
  };
}
