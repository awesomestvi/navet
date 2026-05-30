import type { NavetEntity } from '@navet/core/types';
import { describe, expect, it } from 'vitest';
import { useProviderEntityModel } from '@/app/hooks/use-provider-device';
import { useProviderDevice } from '@/app/internal/compat-hooks';
import { integrationStore } from '@/app/stores/integration-store';
import { renderHookWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';

describe('provider lookup hooks', () => {
  it('falls back to legacy Home Assistant entity ids without treating arbitrary dotted ids as Home Assistant', async () => {
    await resetAppStores();

    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'homey',
      providerDevicesByProviderId: {
        home_assistant: {
          'home_assistant:light.kitchen': {
            id: 'light.kitchen',
            canonicalId: 'home_assistant:light.kitchen',
            nativeId: 'light.kitchen',
            providerId: 'home_assistant',
            kind: 'light',
            name: 'Kitchen Light',
            room: 'Kitchen',
            capabilities: [],
            state: {
              value: 'on',
              brightnessPct: 100,
              colorTemperatureKelvin: 3200,
            },
          },
        },
        homey: {
          'homey:socket-1': {
            id: 'socket-1',
            canonicalId: 'homey:socket-1',
            nativeId: 'socket-1',
            providerId: 'homey',
            kind: 'switch',
            name: 'Coffee Machine',
            room: 'Kitchen',
            capabilities: [],
            state: {
              value: 'off',
            },
          },
        },
      },
      providerDeviceLookupByProviderId: {
        home_assistant: {
          'light.kitchen': 'home_assistant:light.kitchen',
          'home_assistant:light.kitchen': 'home_assistant:light.kitchen',
        },
        homey: {
          'socket-1': 'homey:socket-1',
          'homey:socket-1': 'homey:socket-1',
        },
      },
    });

    const { result: legacyResult } = renderHookWithProviders(() =>
      useProviderDevice('light.kitchen')
    );
    const { result: dottedResult } = renderHookWithProviders(() =>
      useProviderDevice('media.source')
    );

    expect(legacyResult.current).toEqual(
      expect.objectContaining({
        canonicalId: 'home_assistant:light.kitchen',
        providerId: 'home_assistant',
      })
    );
    expect(dottedResult.current).toBeNull();
  });

  it('keeps the same provider entity reference for unrelated updates', async () => {
    await resetAppStores();

    const kitchenEntity: NavetEntity = {
      id: 'home_assistant:light.kitchen',
      canonicalId: 'home_assistant:light.kitchen',
      providerId: 'home_assistant',
      externalId: 'light.kitchen',
      type: 'light',
      name: 'Kitchen Light',
      room: 'Kitchen',
      primaryState: 'on',
      availability: 'available',
      capabilities: [],
      attributes: {
        brightness: 120,
      },
    };

    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          'home_assistant:light.kitchen': kitchenEntity,
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          'light.kitchen': 'home_assistant:light.kitchen',
          'home_assistant:light.kitchen': 'home_assistant:light.kitchen',
        },
      },
    });

    let renderCount = 0;
    const { result } = renderHookWithProviders(() => {
      renderCount += 1;
      return useProviderEntityModel('light.kitchen');
    });

    const initialEntity = result.current;

    integrationStore.setState({
      ...integrationStore.getState(),
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        homey: {
          'homey:socket-1': {
            id: 'homey:socket-1',
            canonicalId: 'homey:socket-1',
            providerId: 'homey',
            externalId: 'socket-1',
            type: 'switch',
            name: 'Coffee Machine',
            room: 'Kitchen',
            primaryState: 'off',
            availability: 'available',
            capabilities: [],
            attributes: {
              value: 'off',
            },
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        homey: {
          'socket-1': 'homey:socket-1',
          'homey:socket-1': 'homey:socket-1',
        },
      },
    });

    expect(renderCount).toBe(1);
    expect(result.current).toBe(initialEntity);
  });
});
