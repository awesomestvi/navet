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
  it('matches light rooms and saved card orders without regard to capitalization', () => {
    const deviceMap = new Map([
      [
        'openhab:accent',
        createDevice({ id: 'openhab:accent', type: 'lights', room: 'living room' }),
      ],
    ]);
    const { result } = renderHook(() =>
      useDashboardDerivedState({
        activeRoom: 'LIVING ROOM',
        availableDeviceMap: deviceMap,
        deviceMap,
        cardOrders: { 'Living Room': ['openhab:accent'] },
        hiddenEntityIds: [],
        rooms: ['Living Room'],
      })
    );

    expect(result.current.lightRooms).toEqual(['Living Room']);
    expect(result.current.orderedCardIds).toEqual(['openhab:accent']);
  });

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
