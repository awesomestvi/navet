import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import type { DeviceCollection } from '@navet/app/types/device.types';
import type { NavetEntity } from '@navet/core/types';
import { describe, expect, it } from 'vitest';
import { buildAggregatedRooms, buildAggregatedRoomsFromProviderEntities } from '../provider-rooms';

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

  it('aggregates canonical rooms from provider entities by normalized room name', () => {
    const devices: NavetEntity[] = [
      {
        id: 'home_assistant:light.kitchen',
        canonicalId: 'home_assistant:light.kitchen',
        providerId: 'home_assistant',
        externalId: 'light.kitchen',
        type: 'light',
        name: 'Kitchen Light',
        room: 'Kitchen',
        primaryState: 'on',
        availability: 'available',
        attributes: {},
        capabilities: ['toggle'],
      },
      {
        id: 'homey:switch_1',
        canonicalId: 'homey:switch_1',
        providerId: 'homey',
        externalId: 'switch_1',
        type: 'switch',
        name: 'Coffee Machine',
        room: ' kitchen ',
        primaryState: 'off',
        availability: 'available',
        attributes: {},
        capabilities: ['toggle'],
      },
    ];

    expect(buildAggregatedRoomsFromProviderEntities(devices)).toEqual([
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
