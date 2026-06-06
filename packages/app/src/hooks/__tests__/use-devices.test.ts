import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import { homeyService } from '@navet/app/services/homey.service';
import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import type { DeviceCollection } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import {
  DEVICE_COLLECTION_KEYS,
  filterDeviceCollectionByProvider,
  mergeDeviceCollections,
  useAggregatedDevices,
  useDeviceCollectionsByKeys,
  useDevices,
} from '../use-devices';

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
});
