import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';
import { useStableMediaArtwork } from '../use-stable-media-artwork';

class MockImage {
  static pending = new Map<string, MockImage[]>();

  onload: null | (() => void) = null;
  onerror: null | (() => void) = null;
  decoding = 'async';

  set src(value: string) {
    const queue = MockImage.pending.get(value) ?? [];
    queue.push(this);
    MockImage.pending.set(value, queue);
  }

  static dispatchLoad(value: string) {
    const image = MockImage.pending.get(value)?.shift();
    image?.onload?.();
  }

  static dispatchError(value: string) {
    const image = MockImage.pending.get(value)?.shift();
    image?.onerror?.();
  }

  static reset() {
    MockImage.pending.clear();
  }
}

describe('useStableMediaArtwork', () => {
  beforeEach(() => {
    MockImage.reset();
    vi.stubGlobal('Image', MockImage);
  });

  it('keeps the previous artwork visible when the next artwork fails to decode', async () => {
    const { result, rerender } = renderHookWithProviders(
      ({ artwork }: { artwork: string | null }) => useStableMediaArtwork(artwork),
      { initialProps: { artwork: 'blob:first-artwork' } }
    );

    act(() => {
      MockImage.dispatchLoad('blob:first-artwork');
    });

    await waitFor(() => {
      expect(result.current).toBe('blob:first-artwork');
    });

    rerender({ artwork: 'blob:broken-artwork' });

    act(() => {
      MockImage.dispatchError('blob:broken-artwork');
    });

    expect(result.current).toBe('blob:first-artwork');
  });
});
