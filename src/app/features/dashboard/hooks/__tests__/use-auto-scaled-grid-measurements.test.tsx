import { renderHook } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useAutoScaledGridMeasurements } from '../use-auto-scaled-grid-measurements';

describe('useAutoScaledGridMeasurements', () => {
  it('skips resize observers when disabled', () => {
    const resizeObserver = vi.fn();
    Object.defineProperty(globalThis, 'ResizeObserver', {
      configurable: true,
      value: resizeObserver,
    });

    const { result } = renderHook(() => useAutoScaledGridMeasurements(800, false));

    expect(resizeObserver).not.toHaveBeenCalled();
    expect(result.current.outerWidth).toBe(0);
    expect(result.current.contentHeight).toBe(0);
  });
});
