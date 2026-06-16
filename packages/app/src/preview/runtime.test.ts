import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { integrationStore } from '@navet/app/stores/integration-store';
import { afterEach, describe, expect, it } from 'vitest';
import { getPreviewRuntimeScenario, installPreviewRuntime, resetPreviewRuntime } from './runtime';

describe('preview runtime', () => {
  afterEach(() => {
    resetPreviewRuntime();
  });

  it('hydrates the integration store from the preview scenario', () => {
    installPreviewRuntime(getPreviewRuntimeScenario('default'));

    const state = integrationStore.getState();
    const helperCollection = state.providerDeviceCollectionsByProviderId.home_assistant?.helpers;

    expect(state.currentProviderId).toBe('home_assistant');
    expect(state.selectedProviderIds).toEqual(['home_assistant']);
    expect(helperCollection).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'home_assistant:input_boolean.guest_mode',
        }),
      ])
    );
  });

  it('routes provider commands through the preview adapter', async () => {
    installPreviewRuntime(getPreviewRuntimeScenario('default'));

    const adapter = getProviderRuntimeRegistration('home_assistant').providerContractAdapter;

    await adapter.execute({
      type: 'turn_off',
      entityId: 'home_assistant:light.living_room',
    });

    const nextEntity =
      integrationStore.getState().providerEntitiesByProviderId.home_assistant?.[
        'home_assistant:light.living_room'
      ];

    expect(nextEntity?.primaryState).toBe('off');
    expect(nextEntity?.attributes.value).toBe('off');
  });
});
