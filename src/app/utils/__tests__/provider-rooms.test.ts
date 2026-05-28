import { describe, expect, it } from 'vitest';
import type { NavetDevice } from '@/app/core/navet';
import { createEmptyDeviceCollection } from '@/app/core/navet-device-collections';
import type { DeviceCollection } from '@/app/types/device.types';
import { buildAggregatedRooms, buildAggregatedRoomsFromNavetDevices } from '../provider-rooms';

describe('provider-rooms', () => {
  it('merges rooms across providers while preserving provider-scoped members', () => {
    const devices: DeviceCollection = {
      ...createEmptyDeviceCollection(),
      lights: [
        {
          id: 'home_assistant:light.kitchen',
          canonicalId: 'home_assistant:light.kitchen',
          nativeId: 'light.kitchen',
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
          id: 'homey:switch_1',
          canonicalId: 'homey:switch_1',
          nativeId: 'switch_1',
          providerId: 'homey',
          name: 'Coffee Machine',
          room: 'Kitchen',
          size: 'small',
          state: false,
        },
      ],
    };

    expect(buildAggregatedRooms(devices)).toEqual([
      {
        id: 'kitchen',
        key: 'kitchen',
        name: 'Kitchen',
        providerIds: ['home_assistant', 'homey'],
        canonicalMemberIds: ['home_assistant:light.kitchen', 'homey:switch_1'],
      },
    ]);
  });

  it('aggregates canonical rooms from Navet devices by normalized room name', () => {
    const devices: NavetDevice[] = [
      {
        id: 'home_assistant:light.kitchen',
        canonicalId: 'home_assistant:light.kitchen',
        providerId: 'home_assistant',
        nativeId: 'light.kitchen',
        kind: 'light',
        name: 'Kitchen Light',
        room: 'Kitchen',
        capabilities: ['toggle'],
        state: { value: 'on' },
      },
      {
        id: 'homey:switch_1',
        canonicalId: 'homey:switch_1',
        providerId: 'homey',
        nativeId: 'switch_1',
        kind: 'switch',
        name: 'Coffee Machine',
        room: ' kitchen ',
        capabilities: ['toggle'],
        state: { on: false },
      },
    ];

    expect(buildAggregatedRoomsFromNavetDevices(devices)).toEqual([
      {
        id: 'kitchen',
        key: 'kitchen',
        name: 'Kitchen',
        providerIds: ['home_assistant', 'homey'],
        canonicalMemberIds: ['home_assistant:light.kitchen', 'homey:switch_1'],
      },
    ]);
  });
});
