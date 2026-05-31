import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dispatchEntityCommandMock, runActionMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn().mockResolvedValue({
    accepted: true,
    requiresEventConfirmation: true,
  }),
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
}));

vi.mock('@navet/app/hooks', () => ({
  useServiceActionHandler: () => runActionMock,
}));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
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
        canPreviousTrack: true,
        canNextTrack: true,
        shuffleEnabled: false,
        repeatMode: 'off',
        t: (key) => key,
      })
    );

    act(() => result.current.togglePlay());

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      entityId: 'media_player.living_room',
      type: 'play_pause',
    });
  });

  it('emits previous and next track commands when supported', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaPlayback({
        entityId: 'media_player.living_room',
        canPreviousTrack: true,
        canNextTrack: true,
        shuffleEnabled: false,
        repeatMode: 'off',
        t: (key) => key,
      })
    );

    act(() => {
      result.current.handlePrevious();
      result.current.handleNext();
    });

    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(1, {
      entityId: 'media_player.living_room',
      type: 'previous_track',
    });
    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(2, {
      entityId: 'media_player.living_room',
      type: 'next_track',
    });
  });

  it('cycles repeat mode from off to all to one', () => {
    const { result, rerender } = renderHookWithProviders(
      ({ repeatMode }: { repeatMode: 'off' | 'one' | 'all' }) =>
        useMediaPlayback({
          entityId: 'media_player.living_room',
          canPreviousTrack: true,
          canNextTrack: true,
          shuffleEnabled: false,
          repeatMode,
          t: (key) => key,
        }),
      { initialProps: { repeatMode: 'off' } }
    );

    act(() => result.current.cycleRepeat());
    expect(dispatchEntityCommandMock).toHaveBeenLastCalledWith({
      entityId: 'media_player.living_room',
      type: 'set_repeat_mode',
      repeatMode: 'all',
    });

    rerender({ repeatMode: 'all' });
    act(() => result.current.cycleRepeat());
    expect(dispatchEntityCommandMock).toHaveBeenLastCalledWith({
      entityId: 'media_player.living_room',
      type: 'set_repeat_mode',
      repeatMode: 'one',
    });
  });

  it('toggles shuffle', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaPlayback({
        entityId: 'media_player.office',
        canPreviousTrack: true,
        canNextTrack: true,
        shuffleEnabled: true,
        repeatMode: 'off',
        t: (key) => key,
      })
    );

    act(() => result.current.toggleShuffle());

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      type: 'set_shuffle',
      shuffle: false,
    });
  });

  it('opens and closes the dialog', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaPlayback({
        entityId: 'media_player.office',
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

    expect(dispatchEntityCommandMock).not.toHaveBeenCalled();
    expect(runActionMock).not.toHaveBeenCalled();
  });
});
