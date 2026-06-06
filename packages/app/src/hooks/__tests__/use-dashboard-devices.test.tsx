import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import type { DeviceCollection } from '@navet/app/types/device.types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDashboardDevices } from '../use-dashboard-devices';

describe('useDashboardDevices', () => {
  it('keeps sensors hidden until explicitly shown', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: [
        {
          id: 'light.kitchen',
          name: 'Kitchen',
          room: 'Kitchen',
          size: 'small',
          state: true,
          brightness: 100,
          temp: 3000,
        },
      ],
      sensors: [
        {
          id: 'sensor.kitchen_temperature',
          name: 'Kitchen Temperature',
          room: 'Kitchen',
          value: '21.4',
          unit: '°C',
          size: 'small',
        },
        {
          id: 'binary_sensor.front_window',
          name: 'Front Window',
          room: 'Hallway',
          value: 'Closed',
          unit: '',
          size: 'small',
        },
      ],
    };

    const { result, rerender } = renderHook(
      ({ shownSensorEntityIds }) => useDashboardDevices(devices, [], shownSensorEntityIds),
      { initialProps: { shownSensorEntityIds: [] as string[] } }
    );

    expect(result.current.lights).toHaveLength(1);
    expect(result.current.sensors).toEqual([]);

    rerender({ shownSensorEntityIds: ['sensor.kitchen_temperature'] });

    expect(result.current.sensors).toEqual([
      expect.objectContaining({ id: 'sensor.kitchen_temperature' }),
    ]);
  });

  it('preserves the original device collection reference when no visibility filters apply', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: [
        {
          id: 'light.kitchen',
          name: 'Kitchen',
          room: 'Kitchen',
          size: 'small',
          state: true,
          brightness: 100,
          temp: 3000,
        },
      ],
    };

    const { result } = renderHook(() => useDashboardDevices(devices, [], ['sensor.none']));

    expect(result.current).toBe(devices);
    expect(result.current.lights).toBe(devices.lights);
  });
});
