import { integrationStore } from '@navet/app/stores/integration-store';
import { act, renderHook } from '@testing-library/react';
import { afterEach, describe, expect, it } from 'vitest';
import { useProviderFeatureMatrix } from '../use-provider-feature-support';

const originalSelectedProviderIds = integrationStore.getState().selectedProviderIds;

afterEach(() => {
  act(() => integrationStore.getState().setSelectedProviders(originalSelectedProviderIds));
});

describe('useProviderFeatureMatrix', () => {
  it('does not rerender an explicit provider feature matrix when the selection changes', () => {
    let renderCount = 0;
    const { result } = renderHook(() => {
      renderCount += 1;
      return useProviderFeatureMatrix('home_assistant');
    });
    const initialMatrix = result.current;
    const initialRenderCount = renderCount;

    act(() => integrationStore.getState().setSelectedProviders(['homey']));

    expect(result.current).toBe(initialMatrix);
    expect(renderCount).toBe(initialRenderCount);
  });

  it('keeps aggregate feature queries subscribed to the selected providers', () => {
    act(() => integrationStore.getState().setSelectedProviders(['home_assistant']));
    let renderCount = 0;
    renderHook(() => {
      renderCount += 1;
      return useProviderFeatureMatrix();
    });
    const initialRenderCount = renderCount;

    act(() => integrationStore.getState().setSelectedProviders(['homey']));

    expect(renderCount).toBeGreaterThan(initialRenderCount);
  });
});
