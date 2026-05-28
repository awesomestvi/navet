import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  browseMediaPlayerMock,
  browseMediaSourceMock,
  getConnectionMock,
  resolveMediaSourceMock,
  sendRemoteCommandMock,
  updateMediaPlayerPowerMock,
} = vi.hoisted(() => ({
  browseMediaPlayerMock: vi.fn(),
  browseMediaSourceMock: vi.fn(),
  getConnectionMock: vi.fn(),
  resolveMediaSourceMock: vi.fn(),
  sendRemoteCommandMock: vi.fn(),
  updateMediaPlayerPowerMock: vi.fn(),
}));

vi.mock('../home-assistant.service', () => ({
  homeAssistantService: {
    browseMediaPlayer: browseMediaPlayerMock,
    browseMediaSource: browseMediaSourceMock,
    clearMediaPlayerPlaylist: vi.fn(),
    getConnection: getConnectionMock,
    playMedia: vi.fn(),
    resolveMediaSource: resolveMediaSourceMock,
    sendRemoteCommand: sendRemoteCommandMock,
    searchMediaPlayer: vi.fn(),
    seekMediaPlayer: vi.fn(),
    selectMediaPlayerSoundMode: vi.fn(),
    selectMediaPlayerSource: vi.fn(),
    updateMediaPlayerPower: updateMediaPlayerPowerMock,
  },
}));

import { integrationMediaFeatureService } from '../integration-media-feature.service';

describe('integrationMediaFeatureService', () => {
  beforeEach(() => {
    browseMediaPlayerMock.mockReset();
    browseMediaSourceMock.mockReset();
    getConnectionMock.mockReset();
    resolveMediaSourceMock.mockReset();
    sendRemoteCommandMock.mockReset();
    updateMediaPlayerPowerMock.mockReset();
  });

  it('maps Home Assistant browse results into platform media items', async () => {
    browseMediaPlayerMock.mockResolvedValue({
      title: 'Library',
      media_class: 'directory',
      media_content_id: 'library',
      media_content_type: 'music',
      can_expand: true,
      children: [
        {
          title: 'Daily Mix',
          media_class: 'playlist',
          media_content_id: 'spotify:playlist:daily',
          media_content_type: 'playlist',
          can_play: true,
          thumbnail: '/api/image',
        },
      ],
    });

    await expect(
      integrationMediaFeatureService.browseMediaPlayer('media_player.kitchen')
    ).resolves.toEqual({
      title: 'Library',
      mediaClass: 'directory',
      mediaContentId: 'library',
      mediaContentType: 'music',
      canExpand: true,
      canPlay: undefined,
      thumbnail: null,
      children: [
        {
          title: 'Daily Mix',
          mediaClass: 'playlist',
          mediaContentId: 'spotify:playlist:daily',
          mediaContentType: 'playlist',
          canExpand: undefined,
          canPlay: true,
          thumbnail: '/api/image',
          children: undefined,
        },
      ],
    });
  });

  it('normalizes media source resolution fields', async () => {
    resolveMediaSourceMock.mockResolvedValue({
      url: '/media/local/photo.jpg',
      mime_type: 'image/jpeg',
    });

    await expect(
      integrationMediaFeatureService.resolveMediaSource(
        'media-source://media_source/local/photo.jpg'
      )
    ).resolves.toEqual({
      url: '/media/local/photo.jpg',
      mimeType: 'image/jpeg',
    });
  });

  it('fetches media thumbnails through the provider feature boundary', async () => {
    const sendMessagePromise = vi.fn().mockResolvedValue({
      content_type: 'image/png',
      content: 'abc123',
    });
    getConnectionMock.mockReturnValue({ sendMessagePromise });

    await expect(
      integrationMediaFeatureService.fetchMediaThumbnailDataUrl('media_player.kitchen')
    ).resolves.toBe('data:image/png;base64,abc123');
    expect(sendMessagePromise).toHaveBeenCalledWith({
      type: 'media_player/thumbnail',
      entity_id: 'media_player.kitchen',
    });
  });

  it('routes media power and remote commands through the provider feature boundary', async () => {
    await integrationMediaFeatureService.updateMediaPlayerPower('media_player.kitchen', 'off');
    await integrationMediaFeatureService.sendRemoteCommand('remote.kitchen', 'MEDIA_PLAY_PAUSE');

    expect(updateMediaPlayerPowerMock).toHaveBeenCalledWith('media_player.kitchen', 'off');
    expect(sendRemoteCommandMock).toHaveBeenCalledWith('remote.kitchen', 'MEDIA_PLAY_PAUSE');
  });
});
