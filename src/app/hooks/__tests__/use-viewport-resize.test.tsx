import { act } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { emitVisualViewportResize } from '@/test/browser-mocks';
import { renderHookWithProviders } from '@/test/render';
import { useViewportResize } from '../use-viewport-resize';

describe('useViewportResize', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('runs once on mount', async () => {
    vi.useFakeTimers();
    const onResize = vi.fn();

    renderHookWithProviders(() => useViewportResize(onResize));
    act(() => vi.runAllTimers());

    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it('batches rapid resize events into one animation frame', async () => {
    vi.useFakeTimers();
    const onResize = vi.fn();
    renderHookWithProviders(() => useViewportResize(onResize));
    onResize.mockClear();

    act(() => {
      window.dispatchEvent(new Event('resize'));
      window.dispatchEvent(new Event('resize'));
      emitVisualViewportResize();
      vi.runAllTimers();
    });
    expect(onResize).toHaveBeenCalledTimes(1);
  });

  it('stops invoking the callback after unmount', async () => {
    vi.useFakeTimers();
    const onResize = vi.fn();
    const { unmount } = renderHookWithProviders(() => useViewportResize(onResize));
    onResize.mockClear();

    unmount();
    act(() => {
      window.dispatchEvent(new Event('resize'));
      vi.runAllTimers();
    });
    expect(onResize).not.toHaveBeenCalled();
  });
});
