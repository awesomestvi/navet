import { useMemo } from 'react';
import { mapNavetDevicesToDeviceCollection } from '@/app/core/navet-device-collections';
import { integrationSelectors } from '../stores/selectors';
import type { DeviceCollection } from '../types/device.types';
import type { IntegrationProviderId } from '../types/provider';
import { getAllRooms } from '../utils/device-location';
import { useIntegrationStore } from './use-integration-store';
import { useProviderCalendarDevicesCollection } from './use-provider-calendar-devices';
import { useProviderWeatherDevicesCollection } from './use-provider-weather-devices';

export const useAggregatedDevices = (): DeviceCollection => {
  const selectedProviderIds = useIntegrationStore(integrationSelectors.selectedProviderIds);
  const devicesByCanonicalId = useIntegrationStore(integrationSelectors.devicesByCanonicalId);
  const calendars = useProviderCalendarDevicesCollection();
  const weather = useProviderWeatherDevicesCollection();

  return useMemo(() => {
    const selectedDevices = Object.values(devicesByCanonicalId).filter((device) =>
      selectedProviderIds.includes(device.providerId)
    );
    const collection = mapNavetDevicesToDeviceCollection(selectedDevices);

    collection.calendars = calendars;
    collection.weather = weather;

    return collection;
  }, [calendars, devicesByCanonicalId, selectedProviderIds, weather]);
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
