import {
  createEmptyDeviceCollection,
  mapNavetEntitiesToDeviceCollection,
} from '@navet/app/core/navet-device-collections';
import { useMemo } from 'react';
import { integrationSelectors } from '../stores/selectors';
import type { DeviceCollection } from '../types/device.types';
import type { IntegrationProviderId } from '../types/provider';
import { getAllRooms } from '../utils/device-location';
import { areArraysEqual } from '../utils/structural-equality';
import { useIntegrationStore } from './use-integration-store';
import { useProviderCalendarDevicesCollection } from './use-provider-calendar-devices';
import { useProviderWeatherDevicesCollection } from './use-provider-weather-devices';

const EMPTY_SELECTED_PROVIDER_IDS: IntegrationProviderId[] = [];
const EMPTY_DEVICE_COLLECTION = Object.freeze(mapNavetEntitiesToDeviceCollection([]));
const EMPTY_DEVICE_COLLECTIONS: DeviceCollection[] = [];
const EMPTY_DEVICE_GROUP_SLICES: ReadonlyArray<readonly unknown[]> = [];

export const DEVICE_COLLECTION_KEYS = [
  'lights',
  'fans',
  'hvac',
  'climate',
  'media',
  'weather',
  'switches',
  'helpers',
  'covers',
  'locks',
  'scenes',
  'persons',
  'sensors',
  'vacuums',
  'calendars',
  'cameras',
  'grouped-sensors',
] as const;

export type DeviceCollectionKey = (typeof DEVICE_COLLECTION_KEYS)[number];

interface UseDevicesOptions {
  enabled?: boolean;
  includeFeatureCollections?: boolean;
}

function assignDeviceCollectionKey<K extends DeviceCollectionKey>(
  collection: DeviceCollection,
  key: K,
  value: DeviceCollection[K]
) {
  collection[key] = value;
}

function buildDeviceCollectionForKeys(
  keys: readonly DeviceCollectionKey[],
  collections: readonly DeviceCollection[]
): DeviceCollection {
  const nextCollection = createEmptyDeviceCollection();

  for (const collection of collections) {
    for (const key of keys) {
      assignDeviceCollectionKey(
        nextCollection,
        key,
        collection[key].length === 0
          ? nextCollection[key]
          : [...nextCollection[key], ...collection[key]]
      );
    }
  }

  return nextCollection;
}

export const useDeviceCollectionsByKeys = (
  keys: readonly DeviceCollectionKey[],
  options?: UseDevicesOptions
): DeviceCollection => {
  const enabled = options?.enabled ?? true;
  const includeFeatureCollections = options?.includeFeatureCollections ?? true;
  const selectedProviderIds = useIntegrationStore(
    (state) =>
      enabled ? integrationSelectors.selectedProviderIds(state) : EMPTY_SELECTED_PROVIDER_IDS,
    areArraysEqual
  );
  const providerGroupSlices = useIntegrationStore(
    (state) => {
      if (!enabled || keys.length === 0) {
        return EMPTY_DEVICE_GROUP_SLICES;
      }

      return selectedProviderIds.flatMap((providerId) => {
        const collection =
          integrationSelectors.providerDeviceCollectionById(providerId)(state) ??
          EMPTY_DEVICE_COLLECTION;
        return keys.map((key) => collection[key]);
      });
    },
    (left, right) => areArraysEqual(left, right, Object.is)
  );
  const calendars = useProviderCalendarDevicesCollection(undefined, {
    enabled: enabled && includeFeatureCollections && keys.includes('calendars'),
  });
  const weather = useProviderWeatherDevicesCollection(undefined, {
    enabled: enabled && includeFeatureCollections && keys.includes('weather'),
  });

  return useMemo(() => {
    if (!enabled) {
      return createEmptyDeviceCollection();
    }

    if (keys.length === 0) {
      return createEmptyDeviceCollection();
    }

    const selectedProviderCollections: DeviceCollection[] = [];
    let sliceIndex = 0;

    for (let providerIndex = 0; providerIndex < selectedProviderIds.length; providerIndex += 1) {
      const collection = createEmptyDeviceCollection();
      for (const key of keys) {
        const slice = providerGroupSlices[sliceIndex];
        assignDeviceCollectionKey(
          collection,
          key,
          Array.isArray(slice) ? (slice as DeviceCollection[typeof key]) : []
        );
        sliceIndex += 1;
      }
      selectedProviderCollections.push(collection);
    }

    const collection = buildDeviceCollectionForKeys(keys, selectedProviderCollections);
    if (keys.includes('calendars')) {
      collection.calendars = calendars;
    }
    if (keys.includes('weather')) {
      collection.weather = weather;
    }

    return collection;
  }, [calendars, enabled, keys, providerGroupSlices, selectedProviderIds, weather]);
};

export const useAggregatedDevices = (options?: UseDevicesOptions): DeviceCollection => {
  const enabled = options?.enabled ?? true;
  const includeFeatureCollections = options?.includeFeatureCollections ?? true;
  const selectedProviderIds = useIntegrationStore(
    (state) =>
      enabled ? integrationSelectors.selectedProviderIds(state) : EMPTY_SELECTED_PROVIDER_IDS,
    areArraysEqual
  );
  const selectedProviderCollections = useIntegrationStore(
    (state) =>
      enabled
        ? selectedProviderIds.map(
            (providerId) =>
              integrationSelectors.providerDeviceCollectionById(providerId)(state) ??
              EMPTY_DEVICE_COLLECTION
          )
        : EMPTY_DEVICE_COLLECTIONS,
    (left, right) => areArraysEqual(left, right, Object.is)
  );
  const calendars = useProviderCalendarDevicesCollection(undefined, {
    enabled: enabled && includeFeatureCollections,
  });
  const weather = useProviderWeatherDevicesCollection(undefined, {
    enabled: enabled && includeFeatureCollections,
  });

  return useMemo(() => {
    if (!enabled) {
      return {
        ...EMPTY_DEVICE_COLLECTION,
        calendars: [],
        weather: [],
      };
    }

    const collection =
      selectedProviderCollections.length === 1
        ? { ...selectedProviderCollections[0] }
        : mergeDeviceCollections(...selectedProviderCollections);

    collection.calendars = calendars;
    collection.weather = weather;

    return collection;
  }, [calendars, enabled, selectedProviderCollections, weather]);
};
export const useDevices = (options?: UseDevicesOptions): DeviceCollection =>
  useDeviceCollectionsByKeys(DEVICE_COLLECTION_KEYS, options);
export const useProviderDevices = (providerId: IntegrationProviderId): DeviceCollection => {
  return useIntegrationStore(
    (state) =>
      integrationSelectors.providerDeviceCollectionById(providerId)(state) ??
      EMPTY_DEVICE_COLLECTION,
    Object.is
  );
};
export const useProviderDeviceCollection = useProviderDevices;
export const useProviderSensorCollection = (providerId: IntegrationProviderId) =>
  useIntegrationStore(
    (state) =>
      (
        integrationSelectors.providerDeviceCollectionById(providerId)(state) ??
        EMPTY_DEVICE_COLLECTION
      ).sensors,
    Object.is
  );
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
