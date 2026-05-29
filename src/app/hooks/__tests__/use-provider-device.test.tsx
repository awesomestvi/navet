import { describe, expect, it } from 'vitest';
import { useProviderDevice } from '@/app/internal/compat-hooks';
import { integrationStore } from '@/app/stores/integration-store';
import { renderHookWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';

describe('useProviderDevice', () => {
  it('falls back to legacy Home Assistant entity ids without treating arbitrary dotted ids as Home Assistant', async () => {
    await resetAppStores();

    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'homey',
      devicesByCanonicalId: {
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
});
