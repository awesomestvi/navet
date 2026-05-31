import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { beforeEach, describe, expect, it } from 'vitest';
import { useAvailabilityEntitiesForCard } from '../card-renderer';

describe('card availability lookup', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('does not rerender for unrelated provider entity updates', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          'home_assistant:camera.front_door': {
            id: 'home_assistant:camera.front_door',
            canonicalId: 'home_assistant:camera.front_door',
            providerId: 'home_assistant',
            externalId: 'camera.front_door',
            type: 'camera',
            name: 'Front Door',
            room: 'Entry',
            primaryState: 'unavailable',
            availability: 'available',
            capabilities: [],
            attributes: {},
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          'camera.front_door': 'home_assistant:camera.front_door',
          'home_assistant:camera.front_door': 'home_assistant:camera.front_door',
        },
      },
    });

    let renderCount = 0;
    const { result } = renderHookWithProviders(() => {
      renderCount += 1;
      return useAvailabilityEntitiesForCard(['camera.front_door'], 'home_assistant');
    });

    const initialEntity = result.current['camera.front_door'];
    expect(initialEntity?.canonicalId).toBe('home_assistant:camera.front_door');

    integrationStore.setState({
      ...integrationStore.getState(),
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          ...(integrationStore.getState().providerEntitiesByProviderId.home_assistant ?? {}),
          'home_assistant:light.kitchen': {
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
            attributes: {},
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          ...(integrationStore.getState().providerEntityLookupByProviderId.home_assistant ?? {}),
          'light.kitchen': 'home_assistant:light.kitchen',
          'home_assistant:light.kitchen': 'home_assistant:light.kitchen',
        },
      },
    });

    expect(renderCount).toBe(1);
    expect(result.current['camera.front_door']).toBe(initialEntity);
  });
});
