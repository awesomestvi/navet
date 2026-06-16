import { integrationStore } from '@navet/app/stores/integration-store';
import { afterEach, describe, expect, it } from 'vitest';
import {
  getPreviewRuntimeScenario,
  installPreviewRuntime,
  resetPreviewRuntime,
} from '../preview/runtime';

describe('demo preview runtime', () => {
  afterEach(() => {
    resetPreviewRuntime();
  });

  it('hydrates the demo preview through the provider-backed runtime', () => {
    installPreviewRuntime(getPreviewRuntimeScenario('demo'));

    const state = integrationStore.getState();
    const homeAssistantEntities = state.providerEntitiesByProviderId.home_assistant;

    expect(state.currentProviderId).toBe('home_assistant');
    expect(state.selectedProviderIds).toEqual(['home_assistant']);
    expect(homeAssistantEntities?.['home_assistant:camera.front_door']).toEqual(
      expect.objectContaining({
        type: 'camera',
        name: 'Front Door',
      })
    );
    expect(homeAssistantEntities?.['home_assistant:input_boolean.guest_mode']).toEqual(
      expect.objectContaining({
        type: 'helper',
        name: 'Guest mode',
      })
    );
  });
});
