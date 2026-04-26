import { act } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';

const { runActionMock, serviceMock } = vi.hoisted(() => ({
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
  serviceMock: {
    setMediaPlayerMute: vi.fn().mockResolvedValue(undefined),
    setMediaPlayerVolume: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/app/hooks', () => ({
  useServiceActionHandler: () => runActionMock,
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

import { useMediaVolume } from '../use-media-volume';

describe('useMediaVolume', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    serviceMock.setMediaPlayerMute.mockClear();
    serviceMock.setMediaPlayerVolume.mockClear();
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

    expect(serviceMock.setMediaPlayerMute).toHaveBeenCalledWith('media_player.office', true);
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

    expect(serviceMock.setMediaPlayerVolume).toHaveBeenCalledWith('media_player.office', 0);
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
    expect(serviceMock.setMediaPlayerVolume).not.toHaveBeenCalled();

    await act(async () => {
      await vi.runAllTimersAsync();
    });

    expect(serviceMock.setMediaPlayerVolume).toHaveBeenCalledWith('media_player.office', 55);
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

    expect(serviceMock.setMediaPlayerVolume).toHaveBeenCalledWith('media_player.office', 45);
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

    expect(serviceMock.setMediaPlayerMute).toHaveBeenCalledWith('media_player.office', false);
    expect(serviceMock.setMediaPlayerVolume).toHaveBeenCalledWith('media_player.office', 30);
  });
});
