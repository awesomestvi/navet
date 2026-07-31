import type { NavetMediaCapabilities } from '@navet/app/core/navet-device-state';
import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { dispatchEntityCommandMock, entitiesState, runActionMock, runtimeServiceMock, serviceMock } =
  vi.hoisted(() => {
    const entitiesState = {
      entities: {} as Record<string, unknown>,
      entityRegistry: [] as Array<{ entityId: string; platform?: string | null }>,
    };
    const serviceMock = {
      selectMediaPlayerSource: vi.fn().mockResolvedValue(undefined),
      selectMediaPlayerSoundMode: vi.fn().mockResolvedValue(undefined),
      seekMediaPlayer: vi.fn().mockResolvedValue(undefined),
      clearMediaPlayerPlaylist: vi.fn().mockResolvedValue(undefined),
      sendRemoteCommand: vi.fn().mockResolvedValue(undefined),
      setMediaPlayerMute: vi.fn().mockResolvedValue(undefined),
      setMediaPlayerVolume: vi.fn().mockResolvedValue(undefined),
      updateMediaPlayerPlayback: vi.fn().mockResolvedValue(undefined),
      updateMediaPlayerPower: vi.fn().mockResolvedValue(undefined),
    };
    const runtimeServiceMock = {
      getEntitySnapshots: vi.fn(() => entitiesState.entities),
      subscribeEntitySnapshots: vi.fn(() => () => {}),
      getEntitySnapshot: vi.fn((entityId: string) => entitiesState.entities[entityId]),
      subscribeEntitySnapshot: vi.fn(() => () => {}),
      getEntityRegistryEntries: vi.fn(() => entitiesState.entityRegistry),
      subscribeEntityRegistryEntries: vi.fn(() => () => {}),
      getEntityRegistryEntry: vi.fn((entityId: string) =>
        entitiesState.entityRegistry.find((entry) => entry.entityId === entityId)
      ),
      subscribeEntityRegistryEntry: vi.fn(() => () => {}),
      getConfig: vi.fn(() => null),
      subscribeConfig: vi.fn(() => () => {}),
    };

    return {
      dispatchEntityCommandMock: vi.fn().mockResolvedValue({
        accepted: true,
        requiresEventConfirmation: true,
      }),
      entitiesState,
      runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
      runtimeServiceMock,
      serviceMock,
    };
  });

vi.mock('@navet/app/hooks', () => ({
  useHomeAssistant: vi.fn((selector: (state: typeof entitiesState) => unknown) =>
    selector(entitiesState)
  ),
  useI18n: () => ({ t: (key: string) => key }),
  useServiceActionHandler: () => runActionMock,
}));

vi.mock('@navet/app/hooks/use-provider-runtime', () => ({
  useProviderRuntime: vi.fn((selector: (state: typeof entitiesState) => unknown) =>
    selector(entitiesState)
  ),
}));

vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: () => ({
    entityRuntimeService: runtimeServiceMock,
    mediaFeatureService: serviceMock,
  }),
}));

vi.mock('@navet/app/commands', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

vi.mock('@navet/app/auth/AuthProvider', () => ({
  useAuthBaseUrl: () => 'http://homeassistant.local:8123',
}));

vi.mock('../use-media-artwork-resolution', () => ({
  useMediaArtworkResolution: () => ({
    albumArt: null,
    artworkResource: null,
    handleArtworkError: vi.fn(),
  }),
}));

import { useMediaCardController } from '../use-media-card-controller';

const mediaCapabilities: NavetMediaCapabilities = {
  canAnnounce: false,
  canBrowseMedia: true,
  canClearPlaylist: true,
  canEnqueue: false,
  canGroup: false,
  canMuteVolume: true,
  canNextTrack: true,
  canPause: true,
  canPlay: true,
  canPlayMedia: true,
  canPreviousTrack: true,
  canRepeat: true,
  canSearchMedia: false,
  canSeek: true,
  canSelectSoundMode: true,
  canSelectSource: true,
  canSetVolume: true,
  canShuffle: true,
  canStop: false,
  canTurnOff: true,
  canTurnOn: true,
  canVolumeStep: false,
};

const defaultParams = {
  entityId: 'media_player.kitchen',
  entityName: 'Kitchen TV',
  deviceClass: 'tv',
  initialTitle: 'Kitchen TV',
  initialArtist: 'Android TV Remote',
  initialState: 'idle' as const,
  initialVolume: 20,
  initialMuted: false,
  initialMediaCapabilities: mediaCapabilities,
};

function setMediaEntities(includeRemote: boolean) {
  entitiesState.entities = {
    'media_player.kitchen': {
      entityId: 'media_player.kitchen',
      state: 'idle',
      attributes: {
        device_class: 'tv',
        volume_level: 0.2,
        is_volume_muted: false,
      },
    },
    ...(includeRemote
      ? {
          'remote.kitchen': {
            entityId: 'remote.kitchen',
            state: 'on',
            attributes: {
              friendly_name: 'Kitchen',
            },
          },
        }
      : {}),
  };
  entitiesState.entityRegistry = [
    { entityId: 'media_player.kitchen', platform: 'androidtv_remote' },
    ...(includeRemote ? [{ entityId: 'remote.kitchen', platform: 'androidtv_remote' }] : []),
  ];
}

describe('useMediaCardController', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeServiceMock.getEntitySnapshots.mockImplementation(() => entitiesState.entities);
    runtimeServiceMock.getEntitySnapshot.mockImplementation(
      (entityId: string) => entitiesState.entities[entityId]
    );
    runtimeServiceMock.getEntityRegistryEntries.mockImplementation(
      () => entitiesState.entityRegistry
    );
    setMediaEntities(true);
  });

  it('routes TV play-pause through the companion Android TV remote entity', () => {
    const { result } = renderHookWithProviders(() => useMediaCardController(defaultParams));

    act(() => result.current.togglePlay());

    expect(serviceMock.sendRemoteCommand).toHaveBeenCalledWith(
      'remote.kitchen',
      'MEDIA_PLAY_PAUSE'
    );
    expect(serviceMock.updateMediaPlayerPlayback).not.toHaveBeenCalled();
  });

  it('falls back to media player play-pause when a TV remote entity is unavailable', () => {
    setMediaEntities(false);

    const { result } = renderHookWithProviders(() => useMediaCardController(defaultParams));

    act(() => result.current.togglePlay());

    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      entityId: 'media_player.kitchen',
      type: 'play_pause',
    });
    expect(serviceMock.sendRemoteCommand).not.toHaveBeenCalled();
  });

  it('resolves canonical Home Assistant ids through the provider media hooks', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaCardController({
        ...defaultParams,
        entityId: 'home_assistant:media_player.kitchen',
      })
    );

    act(() => result.current.togglePlay());

    expect(serviceMock.sendRemoteCommand).toHaveBeenCalledWith(
      'remote.kitchen',
      'MEDIA_PLAY_PAUSE'
    );
    expect(dispatchEntityCommandMock).not.toHaveBeenCalled();
  });

  it('uses the remote companion command mappings for TV playback and navigation', async () => {
    setMediaEntities(true);
    entitiesState.entityRegistry = [
      { entityId: 'media_player.kitchen', platform: 'samsungtv' },
      { entityId: 'remote.kitchen', platform: 'samsungtv' },
    ];

    const { result } = renderHookWithProviders(() => useMediaCardController(defaultParams));

    await act(async () => {
      result.current.togglePlay();
      await Promise.resolve();
    });
    expect(serviceMock.sendRemoteCommand).toHaveBeenCalledWith(
      'remote.kitchen',
      'MEDIA_PLAY_PAUSE'
    );

    await act(async () => {
      result.current.sendRemoteCommand('select');
      await Promise.resolve();
    });
    expect(serviceMock.sendRemoteCommand).toHaveBeenCalledWith('remote.kitchen', 'DPAD_CENTER');
  });

  it('exposes capability-driven media actions from normalized capabilities', () => {
    const { result } = renderHookWithProviders(() => useMediaCardController(defaultParams));

    expect(result.current.mediaCapabilities.canBrowseMedia).toBe(true);
    expect(result.current.mediaCapabilities.canSeek).toBe(true);
    expect(result.current.mediaCapabilities.canPause).toBe(true);
    expect(result.current.canTogglePlayback).toBe(true);

    act(() => result.current.seekTo(30));
    act(() => result.current.selectSoundMode('Movie'));
    act(() => result.current.clearPlaylist());

    expect(serviceMock.seekMediaPlayer).toHaveBeenCalledWith('media_player.kitchen', 30);
    expect(serviceMock.selectMediaPlayerSoundMode).toHaveBeenCalledWith(
      'media_player.kitchen',
      'Movie'
    );
    expect(serviceMock.clearMediaPlayerPlaylist).toHaveBeenCalledWith('media_player.kitchen');
  });

  it('does not seek Spotify account media players even when Home Assistant advertises seek', () => {
    const { result } = renderHookWithProviders(() =>
      useMediaCardController({
        ...defaultParams,
        entityId: 'media_player.spotify_premium',
        entityName: 'Spotify Premium',
        deviceClass: undefined,
      })
    );

    expect(result.current.mediaCapabilities.canSeek).toBe(false);

    act(() => result.current.seekTo(30));

    expect(serviceMock.seekMediaPlayer).not.toHaveBeenCalled();
  });
});
