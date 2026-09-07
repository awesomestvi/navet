import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, it, vi } from 'vitest';
import { usePendingLightValue } from '../use-pending-light-value';

beforeEach(() => vi.useFakeTimers());
afterEach(() => vi.useRealTimers());

it('rejects stale echoes until acknowledgement or expiration', () => {
  const { result, unmount } = renderHook(() => usePendingLightValue(1));
  act(() => result.current.expect(70));
  expect(result.current.accept(20)).toBe(false);
  expect(result.current.accept(69)).toBe(true);
  expect(vi.getTimerCount()).toBe(0);
  act(() => result.current.expect(80, 2500));
  act(() => vi.advanceTimersByTime(2500));
  expect(result.current.accept(20)).toBe(true);
  act(() => result.current.expect(90));
  unmount();
  expect(vi.getTimerCount()).toBe(0);
});
