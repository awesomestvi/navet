import type { DeviceWithType } from '@navet/app/types/device.types';
import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDashboardDerivedState } from '../use-dashboard-derived-state';

function createDevice(overrides: Partial<DeviceWithType> & Pick<DeviceWithType, 'id' | 'type'>) {
  return {
    name: overrides.id,
    room: 'Hallway',
    size: 'small',
    ...overrides,
  } as DeviceWithType;
}

describe('useDashboardDerivedState', () => {
  it('keeps absorbed child entities out of home and room addable entity ids', () => {
    const availableDeviceMap = new Map<string, DeviceWithType>([
      [
        'lock.front_door',
        createDevice({
          id: 'lock.front_door',
          type: 'locks',
          state: true,
        }),
      ],
      [
        'binary_sensor.front_door_contact',
        createDevice({
          id: 'binary_sensor.front_door_contact',
          type: 'sensors',
          value: 'Open',
          unit: '',
        }),
      ],
    ]);
    const deviceMap = new Map<string, DeviceWithType>([
      [
        'lock.front_door',
        createDevice({
          id: 'lock.front_door',
          type: 'locks',
          state: true,
        }),
      ],
    ]);

    const { result } = renderHook(() =>
      useDashboardDerivedState({
        activeRoom: 'Hallway',
        absorbedEntityIds: ['binary_sensor.front_door_contact'],
        availableDeviceMap,
        cardOrders: { Hallway: ['lock.front_door'] },
        deviceMap,
        hiddenEntityIds: ['binary_sensor.front_door_contact'],
        rooms: ['Hallway'],
      })
    );

    expect(result.current.allEntityIds).toEqual([
      'lock.front_door',
      'binary_sensor.front_door_contact',
    ]);
    expect(result.current.addableEntityIds).toEqual([]);
  });
});
