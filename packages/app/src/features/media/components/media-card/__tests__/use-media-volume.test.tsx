import { renderHookWithProviders } from '@navet/app/test/render';
import type { CommandResult } from '@navet/core/types';
import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

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

import { useMediaVolume } from '../use-media-volume';

describe('useMediaVolume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    dispatchEntityCommandMock.mockClear();
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('mutes by setting the mute flag when supported', async () => {
    const { result } = renderHookWithProviders(() =>
      useMediaVolume({
        canMuteVolume: true,
        canSetVolume: true,
        entityId: 'media_player.office',
        initialVolume: 40,
        initialMuted: false,
        t: (key) => key,
      })
    );

    act(() => result.current.toggleMute());

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      type: 'mute',
    });
  });

  it('falls back to setting volume to zero when mute is unsupported', async () => {
    const { result } = renderHookWithProviders(() =>
      useMediaVolume({
        canMuteVolume: false,
        canSetVolume: true,
        entityId: 'media_player.office',
        initialVolume: 60,
        initialMuted: false,
        t: (key) => key,
      })
    );

    act(() => result.current.toggleMute());

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      type: 'set_volume',
      volume: 0,
    });
  });

  it('debounces volume changes before sending them', async () => {
    const { result } = renderHookWithProviders(() =>
      useMediaVolume({
        canMuteVolume: true,
        canSetVolume: true,
        entityId: 'media_player.office',
        initialVolume: 20,
        initialMuted: false,
        t: (key) => key,
      })
    );

    act(() => result.current.handleVolumeChange(55));
    expect(dispatchEntityCommandMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      type: 'set_volume',
      volume: 55,
    });
  });

  it('sends the latest pending volume immediately when interaction ends', async () => {
    const { result } = renderHookWithProviders(() =>
      useMediaVolume({
        canMuteVolume: true,
        canSetVolume: true,
        entityId: 'media_player.office',
        initialVolume: 20,
        initialMuted: false,
        t: (key) => key,
      })
    );

    act(() => {
      result.current.startVolumeInteraction();
      result.current.handleVolumeChange(45);
      result.current.endVolumeInteraction();
    });

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      type: 'set_volume',
      volume: 45,
    });
  });

  it('does not send intermediate volume changes while dragging', async () => {
    const { result } = renderHookWithProviders(() =>
      useMediaVolume({
        canMuteVolume: true,
        canSetVolume: true,
        entityId: 'media_player.office',
        initialVolume: 20,
        initialMuted: false,
        t: (key) => key,
      })
    );

    act(() => {
      result.current.startVolumeInteraction();
      result.current.handleVolumeChange(35);
      result.current.handleVolumeChange(50);
    });

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(dispatchEntityCommandMock).not.toHaveBeenCalled();

    act(() => result.current.endVolumeInteraction());

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      type: 'set_volume',
      volume: 50,
    });
  });

  it('unmutes before setting a non-zero volume when needed', async () => {
    const { result } = renderHookWithProviders(() =>
      useMediaVolume({
        canMuteVolume: true,
        canSetVolume: true,
        entityId: 'media_player.office',
        initialVolume: 0,
        initialMuted: true,
        t: (key) => key,
      })
    );

    act(() => result.current.handleVolumeChange(30));
    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(1, {
      entityId: 'media_player.office',
      type: 'unmute',
    });
    expect(dispatchEntityCommandMock).toHaveBeenNthCalledWith(2, {
      entityId: 'media_player.office',
      type: 'set_volume',
      volume: 30,
    });
  });

  it('keeps volume adjustment active until the volume commit resolves', async () => {
    let resolveDispatch: ((value: CommandResult) => void) | null = null;
    dispatchEntityCommandMock.mockImplementationOnce(
      () =>
        new Promise((resolve) => {
          resolveDispatch = resolve;
        })
    );

    const { result } = renderHookWithProviders(() =>
      useMediaVolume({
        canMuteVolume: true,
        canSetVolume: true,
        entityId: 'media_player.office',
        initialVolume: 0,
        initialMuted: true,
        t: (key) => key,
      })
    );

    act(() => {
      result.current.startVolumeInteraction();
      result.current.handleVolumeChange(50);
      result.current.endVolumeInteraction();
    });

    expect(result.current.isAdjustingVolume).toBe(true);

    await act(async () => {
      resolveDispatch?.({
        accepted: true,
        requiresEventConfirmation: true,
      });
      await Promise.resolve();
    });

    expect(result.current.isAdjustingVolume).toBe(true);

    await act(async () => {
      await vi.advanceTimersByTimeAsync(800);
    });

    expect(result.current.isAdjustingVolume).toBe(false);
  });
});
