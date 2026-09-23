import { setMediaQueryMatch } from '@navet/app/test/browser-mocks';
import { renderHookWithProviders } from '@navet/app/test/render';
import { act, waitFor } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { useMediaQuery } from '../use-media-query';

describe('useMediaQuery', () => {
  it('reads the initial match state', () => {
    setMediaQueryMatch('(max-width: 768px)', true);

    const { result } = renderHookWithProviders(() => useMediaQuery('(max-width: 768px)'));

    expect(result.current).toBe(true);
  });

  it('updates when the media query changes', async () => {
    const { result } = renderHookWithProviders(() => useMediaQuery('(prefers-color-scheme: dark)'));

    act(() => setMediaQueryMatch('(prefers-color-scheme: dark)', true));

    await waitFor(() => expect(result.current).toBe(true));
  });

  it('shares a browser subscription while both consumers receive changes', async () => {
    const query = '(min-width: 1137px)';
    const mediaQuery = window.matchMedia(query);
    const addListener = vi.spyOn(mediaQuery, 'addEventListener');
    const removeListener = vi.spyOn(mediaQuery, 'removeEventListener');

    const first = renderHookWithProviders(() => useMediaQuery(query));
    const second = renderHookWithProviders(() => useMediaQuery(query));
    expect(addListener).toHaveBeenCalledTimes(1);

    act(() => setMediaQueryMatch(query, true));
    await waitFor(() => {
      expect(first.result.current).toBe(true);
      expect(second.result.current).toBe(true);
    });

    first.unmount();
    expect(removeListener).not.toHaveBeenCalled();
    second.unmount();
    expect(removeListener).toHaveBeenCalledTimes(1);
  });

  it('resubscribes when the query prop changes', async () => {
    setMediaQueryMatch('(max-width: 768px)', true);

    const { result, rerender } = renderHookWithProviders(
      ({ query }: { query: string }) => useMediaQuery(query),
      { initialProps: { query: '(max-width: 768px)' } }
    );
    expect(result.current).toBe(true);

    setMediaQueryMatch('(min-width: 1200px)', false);
    rerender({ query: '(min-width: 1200px)' });

    act(() => setMediaQueryMatch('(min-width: 1200px)', true));

    await waitFor(() => expect(result.current).toBe(true));
  });
});
