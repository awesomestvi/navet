import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';

const { dispatchEntityActionMock, runActionMock } = vi.hoisted(() => ({
  dispatchEntityActionMock: vi.fn().mockResolvedValue(undefined),
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
}));

vi.mock('@/app/hooks', () => ({
  useServiceActionHandler: () => runActionMock,
}));

vi.mock('@/app/services/integration-action.service', () => ({
  dispatchEntityAction: dispatchEntityActionMock,
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

    expect(dispatchEntityActionMock).toHaveBeenCalledWith({
      entityId: 'media_player.living_room',
      domain: 'media_player',
      service: 'media_play_pause',
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
    expect(dispatchEntityActionMock).toHaveBeenLastCalledWith({
      entityId: 'media_player.living_room',
      domain: 'media_player',
      service: 'repeat_set',
      serviceData: { repeat: 'all' },
    });

    rerender({ repeatMode: 'all' });
    act(() => result.current.cycleRepeat());
    expect(dispatchEntityActionMock).toHaveBeenLastCalledWith({
      entityId: 'media_player.living_room',
      domain: 'media_player',
      service: 'repeat_set',
      serviceData: { repeat: 'one' },
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

    expect(dispatchEntityActionMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      domain: 'media_player',
      service: 'shuffle_set',
      serviceData: { shuffle: false },
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

    expect(dispatchEntityActionMock).not.toHaveBeenCalled();
    expect(runActionMock).not.toHaveBeenCalled();
  });
});
