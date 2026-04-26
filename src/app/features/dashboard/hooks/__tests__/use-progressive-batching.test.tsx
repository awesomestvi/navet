import { act } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';
import { useProgressiveBatching } from '../use-progressive-batching';

describe('useProgressiveBatching', () => {
  it('returns zero when disabled', () => {
    const { result } = renderHookWithProviders(() => useProgressiveBatching(20, false, false));

    expect(result.current).toBe(0);
  });

  it('returns infinity in edit mode', () => {
    const { result } = renderHookWithProviders(() => useProgressiveBatching(20, true, true));

    expect(result.current).toBe(Infinity);
  });

  it('reveals additional items with the timeout fallback', async () => {
    vi.useFakeTimers();
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: undefined,
    });

    const { result } = renderHookWithProviders(() => useProgressiveBatching(20, false, true));
    expect(result.current).toBe(8);

    act(() => {
      vi.advanceTimersByTime(96);
      vi.advanceTimersByTime(96);
    });

    expect(result.current).toBe(20);
    vi.useRealTimers();
  });

  it('stops at the total count when idle callbacks are available', async () => {
    Object.defineProperty(window, 'requestIdleCallback', {
      configurable: true,
      value: (
        callback: (deadline: { didTimeout: boolean; timeRemaining: () => number }) => void
      ) => {
        callback({ didTimeout: false, timeRemaining: () => 8 });
        return 1;
      },
    });
    Object.defineProperty(window, 'cancelIdleCallback', {
      configurable: true,
      value: vi.fn(),
    });

    const { result } = renderHookWithProviders(() => useProgressiveBatching(14, false, true));

    expect(result.current).toBe(14);
  });
});
