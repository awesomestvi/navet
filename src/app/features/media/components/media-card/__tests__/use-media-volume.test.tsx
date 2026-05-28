import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
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

import { useMediaVolume } from '../use-media-volume';

describe('useMediaVolume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    dispatchEntityActionMock.mockClear();
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

    expect(dispatchEntityActionMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      domain: 'media_player',
      service: 'volume_mute',
      serviceData: { is_volume_muted: true },
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

    expect(dispatchEntityActionMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      domain: 'media_player',
      service: 'volume_set',
      serviceData: { volume_level: 0 },
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
    expect(dispatchEntityActionMock).not.toHaveBeenCalled();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(dispatchEntityActionMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      domain: 'media_player',
      service: 'volume_set',
      serviceData: { volume_level: 0.55 },
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

    expect(dispatchEntityActionMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      domain: 'media_player',
      service: 'volume_set',
      serviceData: { volume_level: 0.45 },
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

    expect(dispatchEntityActionMock).not.toHaveBeenCalled();

    act(() => result.current.endVolumeInteraction());

    expect(dispatchEntityActionMock).toHaveBeenCalledWith({
      entityId: 'media_player.office',
      domain: 'media_player',
      service: 'volume_set',
      serviceData: { volume_level: 0.5 },
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

    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(1, {
      entityId: 'media_player.office',
      domain: 'media_player',
      service: 'volume_mute',
      serviceData: { is_volume_muted: false },
    });
    expect(dispatchEntityActionMock).toHaveBeenNthCalledWith(2, {
      entityId: 'media_player.office',
      domain: 'media_player',
      service: 'volume_set',
      serviceData: { volume_level: 0.3 },
    });
  });
});
