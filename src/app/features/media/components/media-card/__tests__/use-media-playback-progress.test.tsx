import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';
import { useMediaPlaybackProgress } from '../use-media-playback-progress';

describe('useMediaPlaybackProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T10:00:10Z'));
  });

  it('does nothing when playback is not active', () => {
    const setElapsedSeconds = vi.fn();

    renderHookWithProviders(() =>
      useMediaPlaybackProgress({
        isPlaying: false,
        durationSeconds: 200,
        setElapsedSeconds,
      })
    );

    expect(setElapsedSeconds).not.toHaveBeenCalled();
  });

  it('computes elapsed time from the media position timestamp', async () => {
    const setElapsedSeconds = vi.fn();

    renderHookWithProviders(() =>
      useMediaPlaybackProgress({
        isPlaying: true,
        durationSeconds: 200,
        mediaPosition: 30,
        mediaPositionUpdatedAt: '2024-01-01T10:00:00Z',
        setElapsedSeconds,
      })
    );

    expect(setElapsedSeconds).toHaveBeenCalledWith(40);
  });

  it('caps elapsed time at the media duration', async () => {
    const setElapsedSeconds = vi.fn();

    renderHookWithProviders(() =>
      useMediaPlaybackProgress({
        isPlaying: true,
        durationSeconds: 35,
        mediaPosition: 30,
        mediaPositionUpdatedAt: '2024-01-01T10:00:00Z',
        setElapsedSeconds,
      })
    );

    expect(setElapsedSeconds).toHaveBeenCalledWith(35);
  });

  it('ticks forward every second while playing', async () => {
    const setElapsedSeconds = vi.fn();

    renderHookWithProviders(() =>
      useMediaPlaybackProgress({
        isPlaying: true,
        durationSeconds: 50,
        initialElapsedSeconds: 10,
        initialPositionUpdatedAt: '2024-01-01T10:00:09Z',
        setElapsedSeconds,
      })
    );

    act(() => {
      vi.advanceTimersByTime(1000);
    });

    expect(setElapsedSeconds).toHaveBeenLastCalledWith(12);
  });
});
