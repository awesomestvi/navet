import { dispatchNavetCommand } from '@navet/app/commands';
import { homeAssistantStore } from '@navet/app/stores/home-assistant-store';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { callIntegrationService } from '../integration-service-call.service';

vi.mock('@navet/app/provider-contract-registry', () => ({
  getRegisteredSmartHomeProviderAdapter: vi.fn(() => {
    throw new Error('preview runtime should not use the live provider adapter');
  }),
}));

vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: vi.fn(() => ({
    invokeService: vi.fn(() => {
      throw new Error('preview runtime should not invoke the live provider runtime');
    }),
  })),
}));

describe('preview action bridge', () => {
  const originalPreviewRuntime = document.documentElement.dataset.navetPreviewRuntime;
  const originalStoreState = homeAssistantStore.getState();

  beforeEach(() => {
    document.documentElement.dataset.navetPreviewRuntime = 'storybook';
    homeAssistantStore.setState({
      ...originalStoreState,
      connected: true,
      entities: {
        'light.kitchen': {
          entity_id: 'light.kitchen',
          state: 'on',
          attributes: {
            friendly_name: 'Kitchen',
            brightness: 255,
          },
          last_changed: '2026-06-10T08:00:00.000Z',
          last_updated: '2026-06-10T08:00:00.000Z',
          context: { id: 'light-kitchen', parent_id: null, user_id: null },
        },
        'scene.movie_mode': {
          entity_id: 'scene.movie_mode',
          state: 'idle',
          attributes: {
            friendly_name: 'Movie Mode',
          },
          last_changed: '2026-06-10T08:00:00.000Z',
          last_updated: '2026-06-10T08:00:00.000Z',
          context: { id: 'scene-movie-mode', parent_id: null, user_id: null },
        },
      },
    });
  });

  afterEach(() => {
    if (originalPreviewRuntime) {
      document.documentElement.dataset.navetPreviewRuntime = originalPreviewRuntime;
    } else {
      delete document.documentElement.dataset.navetPreviewRuntime;
    }
    homeAssistantStore.setState(originalStoreState);
  });

  it('short-circuits provider command dispatch in preview runtime', async () => {
    const result = await dispatchNavetCommand({
      type: 'turn_off',
      entityId: 'light.kitchen',
    });

    expect(result).toEqual({
      accepted: true,
      requiresEventConfirmation: false,
    });
    expect(homeAssistantStore.getState().entities?.['light.kitchen']?.state).toBe('off');
  });

  it('handles service calls through preview state instead of the live integration runtime', async () => {
    await callIntegrationService({
      entityId: 'scene.movie_mode',
      domain: 'scene',
      service: 'turn_on',
    });

    expect(homeAssistantStore.getState().entities?.['scene.movie_mode']?.state).toBe('scening');
  });
});
