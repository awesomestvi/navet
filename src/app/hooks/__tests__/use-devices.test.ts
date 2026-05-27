import { describe, expect, it } from 'vitest';
import type { DeviceCollection } from '@/app/types/device.types';
import { filterDeviceCollectionByProvider, mergeDeviceCollections } from '../use-devices';
import { createEmptyDeviceCollection } from '../use-ha-devices.helpers';

describe('filterDeviceCollectionByProvider', () => {
  it('returns only devices from the requested provider', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: [
        {
          id: 'light.kitchen',
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
          id: 'device.lamp',
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
          id: 'sensor.temperature',
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
          id: 'light.kitchen',
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
          id: 'switch_1',
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
          id: 'sensor_1#measure_power',
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
