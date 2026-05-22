import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';

const { runActionMock, serviceMock } = vi.hoisted(() => ({
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
  serviceMock: {
    updateMediaPlayerPlayback: vi.fn().mockResolvedValue(undefined),
    setMediaPlayerShuffle: vi.fn().mockResolvedValue(undefined),
    setMediaPlayerRepeat: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/app/hooks', () => ({
  useServiceActionHandler: () => runActionMock,
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

import { useMediaPlayback } from '../use-media-playback';

describe('useMediaPlayback', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('wires service actions through the shared handler', () => {
    expect(runActionMock).toBeTypeOf('function');
  });

  it('toggles playback state', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaPlayback({
        entityId: 'media_player.living_room',
        isPlaying: false,
        canPreviousTrack: true,
        canNextTrack: true,
        shuffleEnabled: false,
        repeatMode: 'off',
        t: (key) => key,
      })
    );

    act(() => result.current.togglePlay());

    expect(serviceMock.updateMediaPlayerPlayback).toHaveBeenCalledWith(
      'media_player.living_room',
      'play'
    );
  });

  it('cycles repeat mode from off to all to one', () => {
    const { result, rerender } = renderHookWithProviders(
      ({ repeatMode }: { repeatMode: 'off' | 'one' | 'all' }) =>
        useMediaPlayback({
          entityId: 'media_player.living_room',
          isPlaying: true,
          canPreviousTrack: true,
          canNextTrack: true,
          shuffleEnabled: false,
          repeatMode,
          t: (key) => key,
        }),
      { initialProps: { repeatMode: 'off' } }
    );

    act(() => result.current.cycleRepeat());
    expect(serviceMock.setMediaPlayerRepeat).toHaveBeenLastCalledWith(
      'media_player.living_room',
      'all'
    );

    rerender({ repeatMode: 'all' });
    act(() => result.current.cycleRepeat());
    expect(serviceMock.setMediaPlayerRepeat).toHaveBeenLastCalledWith(
      'media_player.living_room',
      'one'
    );
  });

  it('toggles shuffle', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaPlayback({
        entityId: 'media_player.office',
        isPlaying: true,
        canPreviousTrack: true,
        canNextTrack: true,
        shuffleEnabled: true,
        repeatMode: 'off',
        t: (key) => key,
      })
    );

    act(() => result.current.toggleShuffle());

    expect(serviceMock.setMediaPlayerShuffle).toHaveBeenCalledWith('media_player.office', false);
  });

  it('opens and closes the dialog', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaPlayback({
        entityId: 'media_player.office',
        isPlaying: true,
        canPreviousTrack: true,
        canNextTrack: true,
        shuffleEnabled: false,
        repeatMode: 'off',
        t: (key) => key,
      })
    );

    act(() => result.current.openDialog());
    expect(result.current.isOpen).toBe(true);

    act(() => result.current.closeDialog(false));
    expect(result.current.isOpen).toBe(false);
  });

  it('does not call previous or next services when the player does not support track skipping', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaPlayback({
        entityId: 'media_player.bedroom',
        isPlaying: true,
        canPreviousTrack: false,
        canNextTrack: false,
        shuffleEnabled: false,
        repeatMode: 'off',
        t: (key) => key,
      })
    );

    act(() => {
      result.current.handlePrevious();
      result.current.handleNext();
    });

    expect(serviceMock.updateMediaPlayerPlayback).not.toHaveBeenCalled();
    expect(runActionMock).not.toHaveBeenCalled();
  });
});
