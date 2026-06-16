import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { describe, expect, it } from 'vitest';
import { useAggregatedRooms } from '../use-aggregated-rooms';

describe('useAggregatedRooms', () => {
  it('aggregates normalized provider rooms across providers by normalized room name', async () => {
    await resetAppStores();

    integrationStore.setState({
      normalizedRoomsByCanonicalId: {
        'home_assistant:kitchen': {
          id: 'home_assistant:kitchen',
          canonicalId: 'home_assistant:kitchen',
          providerId: 'home_assistant',
          externalId: 'kitchen',
          name: 'Kitchen',
          normalizedName: 'kitchen',
          memberIds: ['home_assistant:light.kitchen'],
        },
        'homey:kitchen': {
          id: 'homey:kitchen',
          canonicalId: 'homey:kitchen',
          providerId: 'homey',
          externalId: 'kitchen',
          name: 'Kitchen',
          normalizedName: 'kitchen',
          memberIds: ['homey:switch.coffee'],
        },
        'openhab:living room': {
          id: 'openhab:living room',
          canonicalId: 'openhab:living room',
          providerId: 'openhab',
          externalId: 'living room',
          name: 'Living Room',
          normalizedName: 'living room',
          memberIds: ['openhab:LivingRoomLamp'],
        },
      },
    });

    const { result } = renderHookWithProviders(() => useAggregatedRooms());

    expect(result.current).toEqual([
      {
        id: 'kitchen',
        key: 'kitchen',
        name: 'Kitchen',
        providerIds: ['home_assistant', 'homey'],
        canonicalMemberIds: ['home_assistant:light.kitchen', 'homey:switch.coffee'],
      },
      {
        id: 'living room',
        key: 'living room',
        name: 'Living Room',
        providerIds: ['openhab'],
        canonicalMemberIds: ['openhab:LivingRoomLamp'],
      },
    ]);
  });
});
