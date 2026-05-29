import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMediaPlayerCapabilities } from '@/app/constants/media-player-features';
import { renderHookWithProviders } from '@/test/render';

const { dispatchEntityCommandMock, entitiesState, runActionMock, serviceMock } = vi.hoisted(() => ({
  dispatchEntityCommandMock: vi.fn().mockResolvedValue({
    accepted: true,
    requiresEventConfirmation: true,
  }),
  entitiesState: {
    entities: {} as Record<string, unknown>,
    entityRegistry: [] as Array<{ entityId: string; platform?: string | null }>,
  },
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
  serviceMock: {
    addListener: vi.fn(() => () => {}),
    getEntities: vi.fn(() => entitiesState.entities),
    getEntityRegistry: vi.fn(() => entitiesState.entityRegistry),
    selectMediaPlayerSource: vi.fn().mockResolvedValue(undefined),
    selectMediaPlayerSoundMode: vi.fn().mockResolvedValue(undefined),
    seekMediaPlayer: vi.fn().mockResolvedValue(undefined),
    clearMediaPlayerPlaylist: vi.fn().mockResolvedValue(undefined),
    sendRemoteCommand: vi.fn().mockResolvedValue(undefined),
    setMediaPlayerMute: vi.fn().mockResolvedValue(undefined),
    setMediaPlayerVolume: vi.fn().mockResolvedValue(undefined),
    updateMediaPlayerPlayback: vi.fn().mockResolvedValue(undefined),
    updateMediaPlayerPower: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/app/hooks', () => ({
  useHomeAssistant: vi.fn((selector: (state: typeof entitiesState) => unknown) =>
    selector(entitiesState)
  ),
  useI18n: () => ({ t: (key: string) => key }),
  useServiceActionHandler: () => runActionMock,
}));

vi.mock('@/app/hooks/use-provider-runtime', () => ({
  useProviderRuntime: vi.fn((selector: (state: typeof entitiesState) => unknown) =>
    selector(entitiesState)
  ),
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

vi.mock('@/app/services/integration-action.service', () => ({
  dispatchEntityCommand: dispatchEntityCommandMock,
}));

vi.mock('@/auth/AuthProvider', () => ({
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

const defaultParams = {
  entityId: 'media_player.kitchen',
  entityName: 'Kitchen TV',
  deviceClass: 'tv',
  initialTitle: 'Kitchen TV',
  initialArtist: 'Android TV Remote',
  initialState: 'idle' as const,
  initialVolume: 20,
  initialMuted: false,
  initialMediaCapabilities: getMediaPlayerCapabilities(448439),
};

function setMediaEntities(includeRemote: boolean) {
  entitiesState.entities = {
    'media_player.kitchen': {
      entity_id: 'media_player.kitchen',
      state: 'idle',
      attributes: {
        device_class: 'tv',
        supported_features: 448439,
        volume_level: 0.2,
        is_volume_muted: false,
      },
    },
    ...(includeRemote
      ? {
          'remote.kitchen': {
            entity_id: 'remote.kitchen',
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
    serviceMock.addListener.mockImplementation(() => () => {});
    serviceMock.getEntities.mockImplementation(() => entitiesState.entities);
    serviceMock.getEntityRegistry.mockImplementation(() => entitiesState.entityRegistry);
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

  it('uses media player play-pause for Samsung TV playback while keeping Samsung remote commands', () => {
    setMediaEntities(true);
    entitiesState.entityRegistry = [
      { entityId: 'media_player.kitchen', platform: 'samsungtv' },
      { entityId: 'remote.kitchen', platform: 'samsungtv' },
    ];

    const { result } = renderHookWithProviders(() => useMediaCardController(defaultParams));

    act(() => result.current.togglePlay());
    expect(dispatchEntityCommandMock).toHaveBeenCalledWith({
      entityId: 'media_player.kitchen',
      type: 'play_pause',
    });
    expect(serviceMock.sendRemoteCommand).not.toHaveBeenCalled();

    act(() => result.current.sendRemoteCommand('select'));
    expect(serviceMock.sendRemoteCommand).toHaveBeenCalledWith('remote.kitchen', 'KEY_ENTER');
  });

  it('exposes capability-driven media actions from supported feature flags', () => {
    const { result } = renderHookWithProviders(() => useMediaCardController(defaultParams));

    expect(result.current.mediaCapabilities.canBrowseMedia).toBe(true);
    expect(result.current.mediaCapabilities.canSeek).toBe(true);

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
});
