import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { useMediaPlaybackProgress } from '../use-media-playback-progress';

describe('useMediaPlaybackProgress', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2024-01-01T10:00:10Z'));
  });

  afterEach(() => {
    vi.restoreAllMocks();
    vi.useRealTimers();
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

  it('does not reset elapsed time when no playback position is available', () => {
    const setElapsedSeconds = vi.fn();

    renderHookWithProviders(() =>
      useMediaPlaybackProgress({
        isPlaying: true,
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
      vi.advanceTimersByTime(2000);
    });

    expect(setElapsedSeconds).toHaveBeenLastCalledWith(13);
  });

  it('shares one clock between multiple playing cards', () => {
    const firstSetElapsedSeconds = vi.fn();
    const secondSetElapsedSeconds = vi.fn();
    const setTimeoutSpy = vi.spyOn(window, 'setTimeout');

    renderHookWithProviders(() => {
      useMediaPlaybackProgress({
        isPlaying: true,
        durationSeconds: 50,
        initialElapsedSeconds: 10,
        initialPositionUpdatedAt: '2024-01-01T10:00:09Z',
        setElapsedSeconds: firstSetElapsedSeconds,
      });
      useMediaPlaybackProgress({
        isPlaying: true,
        durationSeconds: 80,
        initialElapsedSeconds: 20,
        initialPositionUpdatedAt: '2024-01-01T10:00:09Z',
        setElapsedSeconds: secondSetElapsedSeconds,
      });
    });

    expect(setTimeoutSpy).toHaveBeenCalledTimes(1);

    act(() => {
      vi.advanceTimersByTime(2000);
    });

    expect(firstSetElapsedSeconds).toHaveBeenLastCalledWith(13);
    expect(secondSetElapsedSeconds).toHaveBeenLastCalledWith(23);
  });

  it('pauses clock work while hidden and catches up when visible again', () => {
    let visibilityState: DocumentVisibilityState = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
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
      visibilityState = 'hidden';
      document.dispatchEvent(new Event('visibilitychange'));
      vi.advanceTimersByTime(5000);
    });
    expect(setElapsedSeconds).toHaveBeenCalledTimes(1);

    act(() => {
      visibilityState = 'visible';
      document.dispatchEvent(new Event('visibilitychange'));
    });
    expect(setElapsedSeconds).toHaveBeenLastCalledWith(16);
  });
});
