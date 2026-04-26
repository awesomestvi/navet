import { act, waitFor } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { setMediaQueryMatch } from '@/test/browser-mocks';
import { renderHookWithProviders } from '@/test/render';
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
