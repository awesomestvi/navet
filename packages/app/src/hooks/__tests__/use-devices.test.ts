import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import { homeyService } from '@navet/app/services/homey.service';
import { useEntityRoomOverridesStore } from '@navet/app/stores/entity-room-overrides-store';
import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { DeviceCollection } from '@navet/app/types/device.types';
import { describe, expect, it, vi } from 'vitest';
import {
  DEVICE_COLLECTION_KEYS,
  filterDeviceCollectionByProvider,
  mergeDeviceCollections,
  useAggregatedDevices,
  useDeviceCollectionsByKeys,
  useDevices,
} from '../use-devices';

vi.mock('../use-provider-calendar-devices', () => ({
  useProviderCalendarDevicesCollection: vi.fn(
    (providerId?: string, options?: { enabled?: boolean }) =>
      options?.enabled === false
        ? []
        : providerId === 'home_assistant'
          ? [
              {
                id: 'home_assistant:calendar.navet_overview',
                providerId: 'home_assistant',
                name: 'Family calendar',
                room: 'Home',
                size: 'medium',
                events: [],
                sourceIds: [],
                sources: [],
              },
            ]
          : []
  ),
}));

vi.mock('../use-provider-weather-devices', () => ({
  useProviderWeatherDevicesCollection: vi.fn(
    (providerId?: string, options?: { enabled?: boolean }) =>
      options?.enabled === false
        ? []
        : providerId === 'home_assistant'
          ? [
              {
                id: 'home_assistant:weather.home',
                providerId: 'home_assistant',
                name: 'Home weather',
                room: 'Home',
                size: 'large',
                location: 'Home',
                temperature: 20,
                condition: 'sunny',
                forecast: [],
              },
            ]
          : []
  ),
}));

describe('filterDeviceCollectionByProvider', () => {
  it('returns only devices from the requested provider', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: [
        {
          id: 'home_assistant:light.kitchen',
          nativeId: 'light.kitchen',
          canonicalId: 'home_assistant:light.kitchen',
          providerId: 'home_assistant',
          name: 'Kitchen Light',
          room: 'Kitchen',
          size: 'small',
          state: true,
          brightness: 100,
          temp: 3200,
        },
      ],
      switches: [
        {
          id: 'homey:device.lamp',
          nativeId: 'device.lamp',
          canonicalId: 'homey:device.lamp',
          providerId: 'homey',
          name: 'Lamp',
          room: 'Living Room',
          size: 'small',
          state: false,
        },
      ],
      sensors: [
        {
          id: 'openhab:sensor.temperature',
          nativeId: 'sensor.temperature',
          canonicalId: 'openhab:sensor.temperature',
          providerId: 'openhab',
          name: 'Outdoor Temperature',
          room: 'Outdoor',
          size: 'small',
          value: '18',
          unit: '°C',
        },
      ],
    };

    expect(filterDeviceCollectionByProvider(devices, 'home_assistant')).toEqual({
      ...createEmptyDeviceCollection(),
      lights: [devices.lights[0]],
    });
    expect(filterDeviceCollectionByProvider(devices, 'homey')).toEqual({
      ...createEmptyDeviceCollection(),
      switches: [devices.switches[0]],
    });
    expect(filterDeviceCollectionByProvider(devices, 'openhab')).toEqual({
      ...createEmptyDeviceCollection(),
      sensors: [devices.sensors[0]],
    });
  });
});

describe('mergeDeviceCollections', () => {
  it('concatenates device collections from multiple providers by device type', () => {
    const homeAssistantDevices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: [
        {
          id: 'home_assistant:light.kitchen',
          nativeId: 'light.kitchen',
          canonicalId: 'home_assistant:light.kitchen',
          providerId: 'home_assistant',
          name: 'Kitchen Light',
          room: 'Kitchen',
          size: 'small',
          state: true,
          brightness: 100,
          temp: 3200,
        },
      ],
    };
    const homeyDevices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      switches: [
        {
          id: 'homey:switch_1',
          nativeId: 'switch_1',
          canonicalId: 'homey:switch_1',
          providerId: 'homey',
          name: 'Coffee Machine',
          room: 'Living Room',
          size: 'small',
          state: false,
        },
      ],
      sensors: [
        {
          id: 'homey:sensor_1#measure_power',
          nativeId: 'sensor_1#measure_power',
          canonicalId: 'homey:sensor_1#measure_power',
          providerId: 'homey',
          name: 'Power',
          room: 'Living Room',
          size: 'small',
          value: '1400',
          unit: 'W',
        },
      ],
    };

    expect(mergeDeviceCollections(homeAssistantDevices, homeyDevices)).toEqual({
      ...createEmptyDeviceCollection(),
      lights: homeAssistantDevices.lights,
      switches: homeyDevices.switches,
      sensors: homeyDevices.sensors,
    });
  });
});

describe('useDevices', () => {
  it('uses canonical provider selection for supported multi-provider categories', async () => {
    await resetAppStores();

    homeAssistantStore.setState({
      entities: {
        'light.kitchen': {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: {
            friendly_name: 'Kitchen Light',
            brightness: 255,
          },
          last_changed: '2024-01-01T00:00:00.000Z',
          last_updated: '2024-01-01T00:00:00.000Z',
          context: { id: 'ctx-ha', parent_id: null, user_id: null },
        },
      },
      areas: [{ area_id: 'kitchen', name: 'Kitchen' }],
      entityRegistry: [{ entity_id: 'light.kitchen', area_id: 'kitchen' }],
    });
    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        living_room: { id: 'living_room', name: 'Living Room' },
      },
      devices: {
        switch_1: {
          id: 'switch_1',
          name: 'Coffee Machine',
          class: 'socket',
          zone: 'living_room',
          capabilitiesObj: {
            onoff: { value: true },
          },
        },
      },
    });
    integrationStore.setState({
      selectedProviderIds: ['home_assistant'],
    });

    const { result } = renderHookWithProviders(() => useDevices());

    expect(result.current.lights).toEqual([
      expect.objectContaining({
        id: 'home_assistant:light.kitchen',
        room: 'Kitchen',
      }),
    ]);
    expect(result.current.switches).toEqual([]);
  });

  it('returns devices from every selected provider without routing through a fake HA snapshot', async () => {
    await resetAppStores();

    integrationStore.setState({
      providerDeviceCollectionsByProviderId: {
        home_assistant: {
          ...createEmptyDeviceCollection(),
          lights: [
            {
              id: 'home_assistant:light.kitchen',
              nativeId: 'light.kitchen',
              canonicalId: 'home_assistant:light.kitchen',
              providerId: 'home_assistant',
              name: 'Kitchen Light',
              room: 'Kitchen',
              size: 'small',
              state: true,
              brightness: 100,
              temp: 3200,
            },
          ],
        },
        homey: {
          ...createEmptyDeviceCollection(),
          switches: [
            {
              id: 'homey:switch_1',
              nativeId: 'switch_1',
              canonicalId: 'homey:switch_1',
              providerId: 'homey',
              name: 'Coffee Machine',
              room: 'Living Room',
              size: 'small',
              state: false,
            },
          ],
        },
      },
      selectedProviderIds: ['home_assistant', 'homey'],
    });

    const { result } = renderHookWithProviders(() => useDevices());

    expect(result.current.lights).toEqual([
      expect.objectContaining({
        id: 'home_assistant:light.kitchen',
        providerId: 'home_assistant',
      }),
    ]);
    expect(result.current.switches).toEqual([
      expect.objectContaining({
        id: 'homey:switch_1',
        providerId: 'homey',
      }),
    ]);
  });

  it('keeps weather and calendar devices from selected providers when the current provider differs', async () => {
    await resetAppStores();

    integrationStore.setState({
      currentProviderId: 'homey',
      selectedProviderIds: ['home_assistant', 'homey'],
      providerDeviceCollectionsByProviderId: {
        home_assistant: createEmptyDeviceCollection(),
        homey: createEmptyDeviceCollection(),
      },
    });

    const { result } = renderHookWithProviders(() =>
      useDeviceCollectionsByKeys(['weather', 'calendars'])
    );

    expect(result.current.weather).toEqual([
      expect.objectContaining({
        id: 'home_assistant:weather.home',
        providerId: 'home_assistant',
      }),
    ]);
    expect(result.current.calendars).toEqual([
      expect.objectContaining({
        id: 'home_assistant:calendar.navet_overview',
        providerId: 'home_assistant',
      }),
    ]);
  });

  it('subscribes only to requested device groups', async () => {
    await resetAppStores();

    integrationStore.setState({
      providerDeviceCollectionsByProviderId: {
        home_assistant: {
          ...createEmptyDeviceCollection(),
          media: [
            {
              id: 'home_assistant:media_player.kitchen',
              nativeId: 'media_player.kitchen',
              canonicalId: 'home_assistant:media_player.kitchen',
              providerId: 'home_assistant',
              name: 'Kitchen Speaker',
              room: 'Kitchen',
              size: 'small',
              title: 'Evening Jazz',
              artist: 'Kitchen Trio',
              state: 'playing',
              volume: 0.42,
              isMuted: false,
            },
          ],
          lights: [
            {
              id: 'home_assistant:light.kitchen',
              nativeId: 'light.kitchen',
              canonicalId: 'home_assistant:light.kitchen',
              providerId: 'home_assistant',
              name: 'Kitchen Light',
              room: 'Kitchen',
              size: 'small',
              state: true,
              brightness: 100,
              temp: 3200,
            },
          ],
        },
      },
      selectedProviderIds: ['home_assistant'],
    });

    const { result } = renderHookWithProviders(() =>
      useDeviceCollectionsByKeys(['media', 'cameras'])
    );

    expect(result.current.media).toEqual([
      expect.objectContaining({
        id: 'home_assistant:media_player.kitchen',
      }),
    ]);
    expect(result.current.cameras).toEqual([]);
    expect(result.current.lights).toEqual([]);
  });

  it('returns an empty device collection when disabled', async () => {
    await resetAppStores();

    integrationStore.setState({
      selectedProviderIds: ['home_assistant', 'homey'],
      providerDeviceCollectionsByProviderId: {
        home_assistant: {
          ...createEmptyDeviceCollection(),
          lights: [
            {
              id: 'home_assistant:light.kitchen',
              nativeId: 'light.kitchen',
              canonicalId: 'home_assistant:light.kitchen',
              providerId: 'home_assistant',
              name: 'Kitchen Light',
              room: 'Kitchen',
              size: 'small',
              state: true,
              brightness: 100,
              temp: 3200,
            },
          ],
        },
      },
    });

    const { result } = renderHookWithProviders(() => useAggregatedDevices({ enabled: false }));

    expect(result.current).toEqual(createEmptyDeviceCollection());
  });

  it('keeps the full hook aligned with the keyed hook contract', async () => {
    await resetAppStores();

    const { result } = renderHookWithProviders(() => useDevices());
    const { result: keyedResult } = renderHookWithProviders(() =>
      useDeviceCollectionsByKeys(DEVICE_COLLECTION_KEYS)
    );

    expect(result.current).toEqual(keyedResult.current);
  });

  it('applies Navet-local room overrides for unmanaged entities', async () => {
    await resetAppStores();

    integrationStore.setState({
      selectedProviderIds: ['home_assistant'],
      roomDescriptors: [
        {
          id: 'home_assistant:office',
          name: 'Office',
          providerIds: ['home_assistant'],
          memberIds: [],
          canonicalId: 'room-office',
          normalizedName: 'office',
          sources: [],
        },
      ],
      providerDeviceCollectionsByProviderId: {
        home_assistant: {
          ...createEmptyDeviceCollection(),
          media: [
            {
              id: 'home_assistant:media_player.lounge_room',
              canonicalId: 'home_assistant:media_player.lounge_room',
              providerId: 'home_assistant',
              nativeId: 'media_player.lounge_room',
              name: 'Lounge room',
              room: 'Unassigned',
              size: 'medium',
              title: 'Netflix',
              artist: '',
              state: 'playing',
              volume: 100,
              isMuted: false,
            },
          ],
        },
      },
    });
    useEntityRoomOverridesStore
      .getState()
      .setRoomOverride('home_assistant:media_player.lounge_room', 'home_assistant:office');

    const { result } = renderHookWithProviders(() => useAggregatedDevices());

    expect(result.current.media[0]?.room).toBe('Office');
  });

  it('applies Navet-local room overrides when collection ids differ from override ids', async () => {
    await resetAppStores();

    integrationStore.setState({
      selectedProviderIds: ['home_assistant'],
      roomDescriptors: [
        {
          id: 'office',
          name: 'Office',
          providerIds: ['home_assistant'],
          memberIds: [],
          canonicalId: 'office',
          normalizedName: 'office',
          sources: [
            {
              providerId: 'home_assistant',
              nativeId: 'office',
              sourceType: 'provider_managed',
              supportsOrdering: true,
              supportsDeletion: true,
            },
          ],
        },
      ],
      providerDeviceCollectionsByProviderId: {
        home_assistant: {
          ...createEmptyDeviceCollection(),
          media: [
            {
              id: 'media_player.walkman',
              canonicalId: 'home_assistant:media_player.walkman',
              providerId: 'home_assistant',
              nativeId: 'media_player.walkman',
              name: 'Walkman',
              room: 'Unassigned',
              size: 'medium',
              title: 'Bounzz',
              artist: '',
              state: 'playing',
              volume: 100,
              isMuted: false,
            },
          ],
        },
      },
    });
    useEntityRoomOverridesStore
      .getState()
      .setRoomOverride('home_assistant:media_player.walkman', 'home_assistant:office');

    const { result } = renderHookWithProviders(() => useAggregatedDevices());

    expect(result.current.media[0]?.room).toBe('Office');
  });
});
