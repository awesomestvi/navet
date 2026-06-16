import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import type { DeviceCollection } from '@navet/app/types/device.types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDeviceMap } from '../use-device-map';

function createDevices(
  overrides: Partial<DeviceCollection['lights'][number]> = {}
): DeviceCollection['lights'] {
  return [
    {
      id: 'light.kitchen',
      providerId: 'home_assistant',
      nativeId: 'light.kitchen',
      canonicalId: 'home_assistant:light.kitchen',
      name: 'Kitchen Light',
      room: 'Kitchen',
      size: 'small',
      state: true,
      brightness: 100,
      temp: 3200,
      ...overrides,
    },
  ];
}

describe('useDeviceMap', () => {
  it('keeps the same map and typed device references when raw devices are unchanged', () => {
    const initialDevices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: createDevices(),
    };

    const { result, rerender } = renderHook(({ devices }) => useDeviceMap(devices), {
      initialProps: { devices: initialDevices },
    });
    const initialMap = result.current.deviceMap;
    const initialDevice = initialMap.get('light.kitchen');

    rerender({ devices: initialDevices });

    expect(result.current.deviceMap).toBe(initialMap);
    expect(result.current.deviceMap.get('light.kitchen')).toBe(initialDevice);
  });

  it('preserves unchanged typed devices while replacing only changed entries', () => {
    const kitchenLight = createDevices()[0];
    const hallwayLight = {
      ...kitchenLight,
      id: 'light.hallway',
      nativeId: 'light.hallway',
      canonicalId: 'home_assistant:light.hallway',
      name: 'Hallway Light',
      room: 'Hallway',
    };
    const initialDevices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: [kitchenLight, hallwayLight],
    };

    const { result, rerender } = renderHook(({ devices }) => useDeviceMap(devices), {
      initialProps: { devices: initialDevices },
    });
    const initialKitchen = result.current.deviceMap.get('light.kitchen');
    const initialHallway = result.current.deviceMap.get('light.hallway');

    rerender({
      devices: {
        ...createEmptyDeviceCollection(),
        lights: [kitchenLight, { ...hallwayLight, brightness: 25 }],
      },
    });

    expect(result.current.deviceMap.get('light.kitchen')).toBe(initialKitchen);
    expect(result.current.deviceMap.get('light.hallway')).not.toBe(initialHallway);
  });
});
