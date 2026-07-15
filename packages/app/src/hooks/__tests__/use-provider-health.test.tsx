import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { resetAppStores } from '@navet/app/test/store-reset';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import { useProviderHealth } from '../use-provider-health';

describe('useProviderHealth', () => {
  beforeEach(async () => {
    await resetAppStores();
  });

  it('keeps a provider-specific subscription stable when another provider changes', () => {
    let renderCount = 0;
    const { result } = renderHookWithProviders(() => {
      renderCount += 1;
      return useProviderHealth('home_assistant');
    });
    const initialHealth = result.current;

    act(() => {
      integrationStore.setState((state) => ({
        providerHealth: {
          ...state.providerHealth,
          openhab: {
            ...state.providerHealth.openhab,
            lastError: 'OpenHAB is temporarily unavailable',
          },
        },
      }));
    });

    expect(result.current).toBe(initialHealth);
    expect(renderCount).toBe(1);

    act(() => {
      integrationStore.setState((state) => ({
        providerHealth: {
          ...state.providerHealth,
          home_assistant: {
            ...state.providerHealth.home_assistant,
            lastError: 'Home Assistant is temporarily unavailable',
          },
        },
      }));
    });

    expect(result.current.lastError).toBe('Home Assistant is temporarily unavailable');
    expect(renderCount).toBe(2);
  });
});
