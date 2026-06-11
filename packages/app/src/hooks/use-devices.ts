import {
  createEmptyDeviceCollection,
  mapNavetEntitiesToDeviceCollection,
} from '@navet/app/core/navet-device-collections';
import { useMemo } from 'react';
import { useEntityRoomOverridesStore } from '../stores/entity-room-overrides-store';
import { integrationSelectors } from '../stores/selectors';
import type { DeviceCollection } from '../types/device.types';
import type { IntegrationProviderId } from '../types/provider';
import { getAllRooms } from '../utils/device-location';
import { createProviderScopedId } from '../utils/provider-ids';
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

function buildRoomNamesById(
  roomDescriptors: ReadonlyArray<{
    id: string;
    canonicalId: string;
    normalizedName: string;
    name: string;
    sources: ReadonlyArray<{
      providerId: IntegrationProviderId;
      nativeId: string;
      canonicalId?: string;
    }>;
  }>
) {
  const roomNamesById: Record<string, string> = {};

  roomDescriptors.forEach((room) => {
    roomNamesById[room.id] = room.name;
    roomNamesById[room.canonicalId] = room.name;
    roomNamesById[room.normalizedName] = room.name;

    room.sources.forEach((source) => {
      roomNamesById[createProviderScopedId(source.providerId, source.nativeId)] = room.name;
      if (typeof source.canonicalId === 'string' && source.canonicalId.length > 0) {
        roomNamesById[source.canonicalId] = room.name;
      }
    });
  });

  return roomNamesById;
}

function getRoomOverrideIdForDevice(
  device: {
    id: string;
    canonicalId?: string;
    nativeId?: string;
    providerId?: IntegrationProviderId;
  },
  roomIdsByEntityId: Record<string, string>
) {
  const directRoomId = roomIdsByEntityId[device.id];
  if (directRoomId) {
    return directRoomId;
  }

  if (typeof device.canonicalId === 'string' && device.canonicalId.length > 0) {
    const canonicalRoomId = roomIdsByEntityId[device.canonicalId];
    if (canonicalRoomId) {
      return canonicalRoomId;
    }
  }

  if (
    typeof device.nativeId === 'string' &&
    device.nativeId.length > 0 &&
    typeof device.providerId === 'string'
  ) {
    return roomIdsByEntityId[createProviderScopedId(device.providerId, device.nativeId)];
  }

  return undefined;
}

function applyRoomOverridesToDevices<
  T extends {
    id: string;
    room: string;
    canonicalId?: string;
    nativeId?: string;
    providerId?: IntegrationProviderId;
  },
>(
  devices: T[],
  roomIdsByEntityId: Record<string, string>,
  roomNamesById: Record<string, string>
): T[] {
  let nextDevices: T[] | null = null;

  devices.forEach((device, index) => {
    const roomId = getRoomOverrideIdForDevice(device, roomIdsByEntityId);
    const roomName = roomId ? roomNamesById[roomId] : undefined;
    if (!roomName || roomName === device.room) {
      return;
    }

    if (!nextDevices) {
      nextDevices = [...devices];
    }

    nextDevices[index] = { ...device, room: roomName };
  });

  return nextDevices ?? devices;
}

function applyRoomOverrides(
  collection: DeviceCollection,
  roomIdsByEntityId: Record<string, string>,
  roomNamesById: Record<string, string>
): DeviceCollection {
  if (Object.keys(roomIdsByEntityId).length === 0 || Object.keys(roomNamesById).length === 0) {
    return collection;
  }

  const lights = applyRoomOverridesToDevices(collection.lights, roomIdsByEntityId, roomNamesById);
  const fans = applyRoomOverridesToDevices(collection.fans, roomIdsByEntityId, roomNamesById);
  const hvac = applyRoomOverridesToDevices(collection.hvac, roomIdsByEntityId, roomNamesById);
  const climate = applyRoomOverridesToDevices(collection.climate, roomIdsByEntityId, roomNamesById);
  const media = applyRoomOverridesToDevices(collection.media, roomIdsByEntityId, roomNamesById);
  const weather = applyRoomOverridesToDevices(collection.weather, roomIdsByEntityId, roomNamesById);
  const switches = applyRoomOverridesToDevices(
    collection.switches,
    roomIdsByEntityId,
    roomNamesById
  );
  const helpers = applyRoomOverridesToDevices(collection.helpers, roomIdsByEntityId, roomNamesById);
  const covers = applyRoomOverridesToDevices(collection.covers, roomIdsByEntityId, roomNamesById);
  const locks = applyRoomOverridesToDevices(collection.locks, roomIdsByEntityId, roomNamesById);
  const scenes = applyRoomOverridesToDevices(collection.scenes, roomIdsByEntityId, roomNamesById);
  const persons = applyRoomOverridesToDevices(collection.persons, roomIdsByEntityId, roomNamesById);
  const sensors = applyRoomOverridesToDevices(collection.sensors, roomIdsByEntityId, roomNamesById);
  const vacuums = applyRoomOverridesToDevices(collection.vacuums, roomIdsByEntityId, roomNamesById);
  const calendars = applyRoomOverridesToDevices(
    collection.calendars,
    roomIdsByEntityId,
    roomNamesById
  );
  const cameras = applyRoomOverridesToDevices(collection.cameras, roomIdsByEntityId, roomNamesById);
  const groupedSensors = applyRoomOverridesToDevices(
    collection['grouped-sensors'],
    roomIdsByEntityId,
    roomNamesById
  );

  const unchanged =
    lights === collection.lights &&
    fans === collection.fans &&
    hvac === collection.hvac &&
    climate === collection.climate &&
    media === collection.media &&
    weather === collection.weather &&
    switches === collection.switches &&
    helpers === collection.helpers &&
    covers === collection.covers &&
    locks === collection.locks &&
    scenes === collection.scenes &&
    persons === collection.persons &&
    sensors === collection.sensors &&
    vacuums === collection.vacuums &&
    calendars === collection.calendars &&
    cameras === collection.cameras &&
    groupedSensors === collection['grouped-sensors'];

  if (unchanged) {
    return collection;
  }

  return {
    ...collection,
    lights,
    fans,
    hvac,
    climate,
    media,
    weather,
    switches,
    helpers,
    covers,
    locks,
    scenes,
    persons,
    sensors,
    vacuums,
    calendars,
    cameras,
    'grouped-sensors': groupedSensors,
  };
}

function useSelectedProviderFeatureCollections({
  selectedProviderIds,
  enabled,
  includeCalendars,
  includeWeather,
}: {
  selectedProviderIds: readonly IntegrationProviderId[];
  enabled: boolean;
  includeCalendars: boolean;
  includeWeather: boolean;
}) {
  const selectedProviderIdSet = useMemo(() => new Set(selectedProviderIds), [selectedProviderIds]);

  const homeAssistantCalendars = useProviderCalendarDevicesCollection('home_assistant', {
    enabled: enabled && includeCalendars && selectedProviderIdSet.has('home_assistant'),
  });
  const homeyCalendars = useProviderCalendarDevicesCollection('homey', {
    enabled: enabled && includeCalendars && selectedProviderIdSet.has('homey'),
  });
  const openhabCalendars = useProviderCalendarDevicesCollection('openhab', {
    enabled: enabled && includeCalendars && selectedProviderIdSet.has('openhab'),
  });
  const hubitatCalendars = useProviderCalendarDevicesCollection('hubitat', {
    enabled: enabled && includeCalendars && selectedProviderIdSet.has('hubitat'),
  });
  const smartthingsCalendars = useProviderCalendarDevicesCollection('smartthings', {
    enabled: enabled && includeCalendars && selectedProviderIdSet.has('smartthings'),
  });

  const homeAssistantWeather = useProviderWeatherDevicesCollection('home_assistant', {
    enabled: enabled && includeWeather && selectedProviderIdSet.has('home_assistant'),
  });
  const homeyWeather = useProviderWeatherDevicesCollection('homey', {
    enabled: enabled && includeWeather && selectedProviderIdSet.has('homey'),
  });
  const openhabWeather = useProviderWeatherDevicesCollection('openhab', {
    enabled: enabled && includeWeather && selectedProviderIdSet.has('openhab'),
  });
  const hubitatWeather = useProviderWeatherDevicesCollection('hubitat', {
    enabled: enabled && includeWeather && selectedProviderIdSet.has('hubitat'),
  });
  const smartthingsWeather = useProviderWeatherDevicesCollection('smartthings', {
    enabled: enabled && includeWeather && selectedProviderIdSet.has('smartthings'),
  });

  const calendars = useMemo(
    () => [
      ...homeAssistantCalendars,
      ...homeyCalendars,
      ...openhabCalendars,
      ...hubitatCalendars,
      ...smartthingsCalendars,
    ],
    [
      homeAssistantCalendars,
      homeyCalendars,
      hubitatCalendars,
      openhabCalendars,
      smartthingsCalendars,
    ]
  );
  const weather = useMemo(
    () => [
      ...homeAssistantWeather,
      ...homeyWeather,
      ...openhabWeather,
      ...hubitatWeather,
      ...smartthingsWeather,
    ],
    [homeAssistantWeather, homeyWeather, hubitatWeather, openhabWeather, smartthingsWeather]
  );

  return { calendars, weather };
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
  const roomDescriptors = useIntegrationStore(integrationSelectors.roomDescriptors);
  const roomIdsByEntityId = useEntityRoomOverridesStore((state) => state.roomIdsByEntityId);
  const roomNamesById = useMemo(() => buildRoomNamesById(roomDescriptors), [roomDescriptors]);
  const { calendars, weather } = useSelectedProviderFeatureCollections({
    selectedProviderIds,
    enabled,
    includeCalendars: includeFeatureCollections && keys.includes('calendars'),
    includeWeather: includeFeatureCollections && keys.includes('weather'),
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

    const collection = applyRoomOverrides(
      buildDeviceCollectionForKeys(keys, selectedProviderCollections),
      roomIdsByEntityId,
      roomNamesById
    );
    if (keys.includes('calendars')) {
      collection.calendars = calendars;
    }
    if (keys.includes('weather')) {
      collection.weather = weather;
    }

    return collection;
  }, [
    calendars,
    enabled,
    keys,
    providerGroupSlices,
    roomIdsByEntityId,
    roomNamesById,
    selectedProviderIds,
    weather,
  ]);
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
  const roomDescriptors = useIntegrationStore(integrationSelectors.roomDescriptors);
  const roomIdsByEntityId = useEntityRoomOverridesStore((state) => state.roomIdsByEntityId);
  const roomNamesById = useMemo(() => buildRoomNamesById(roomDescriptors), [roomDescriptors]);
  const { calendars, weather } = useSelectedProviderFeatureCollections({
    selectedProviderIds,
    enabled,
    includeCalendars: includeFeatureCollections,
    includeWeather: includeFeatureCollections,
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

    return applyRoomOverrides(collection, roomIdsByEntityId, roomNamesById);
  }, [calendars, enabled, roomIdsByEntityId, roomNamesById, selectedProviderCollections, weather]);
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
export const useCalendarDevicesCollection = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;
  const selectedProviderIds = useIntegrationStore(
    (state) =>
      enabled ? integrationSelectors.selectedProviderIds(state) : EMPTY_SELECTED_PROVIDER_IDS,
    areArraysEqual
  );

  return useSelectedProviderFeatureCollections({
    selectedProviderIds,
    enabled,
    includeCalendars: true,
    includeWeather: false,
  }).calendars;
};
export const useWeatherDevicesCollection = (options?: { enabled?: boolean }) => {
  const enabled = options?.enabled ?? true;
  const selectedProviderIds = useIntegrationStore(
    (state) =>
      enabled ? integrationSelectors.selectedProviderIds(state) : EMPTY_SELECTED_PROVIDER_IDS,
    areArraysEqual
  );

  return useSelectedProviderFeatureCollections({
    selectedProviderIds,
    enabled,
    includeCalendars: false,
    includeWeather: true,
  }).weather;
};
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
