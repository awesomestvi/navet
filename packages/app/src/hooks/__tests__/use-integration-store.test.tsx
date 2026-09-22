import { integrationStore } from '@navet/app/stores/integration-store';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useProviderId } from '../use-integration-store';

const originalProviderId = integrationStore.getState().currentProviderId;

afterEach(() => {
  act(() => integrationStore.getState().setCurrentProviderId(originalProviderId));
});

describe('useProviderId', () => {
  it('does not rerender for current-provider changes when an explicit provider is supplied', () => {
    act(() => integrationStore.getState().setCurrentProviderId('home_assistant'));
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return useProviderId('home_assistant');
    });
    const initialRenderCount = renderCount;

    act(() => integrationStore.getState().setCurrentProviderId('homey'));

    expect(result.current).toBe('home_assistant');
    expect(renderCount).toBe(initialRenderCount);
  });

  it('continues to follow the current provider when no provider is supplied', () => {
    act(() => integrationStore.getState().setCurrentProviderId('home_assistant'));
    const { result } = renderHook(() => useProviderId());

    act(() => integrationStore.getState().setCurrentProviderId('homey'));

    expect(result.current).toBe('homey');
  });
});
