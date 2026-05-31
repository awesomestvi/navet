import { beforeEach, describe, expect, it, vi } from 'vitest';

const {
  browseMediaPlayerMock,
  browseMediaSourceMock,
  getProviderRuntimeRegistrationMock,
  resolveMediaSourceMock,
  sendRemoteCommandMock,
  updateMediaPlayerPowerMock,
} = vi.hoisted(() => ({
  browseMediaPlayerMock: vi.fn(),
  browseMediaSourceMock: vi.fn(),
  getProviderRuntimeRegistrationMock: vi.fn(),
  resolveMediaSourceMock: vi.fn(),
  sendRemoteCommandMock: vi.fn(),
  updateMediaPlayerPowerMock: vi.fn(),
}));

vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: getProviderRuntimeRegistrationMock,
}));

import { integrationMediaFeatureService } from '../integration-media-feature.service';

describe('integrationMediaFeatureService', () => {
  beforeEach(() => {
    browseMediaPlayerMock.mockReset();
    browseMediaSourceMock.mockReset();
    getProviderRuntimeRegistrationMock.mockReset();
    resolveMediaSourceMock.mockReset();
    sendRemoteCommandMock.mockReset();
    updateMediaPlayerPowerMock.mockReset();
    getProviderRuntimeRegistrationMock.mockReturnValue({
      mediaFeatureService: {
        browseMediaPlayer: browseMediaPlayerMock,
        browseMediaSource: browseMediaSourceMock,
        clearMediaPlayerPlaylist: vi.fn(),
        fetchMediaThumbnailDataUrl: vi.fn(
          async (_entityId: string) => 'data:image/png;base64,abc123'
        ),
        playMedia: vi.fn(),
        resolveMediaSource: resolveMediaSourceMock,
        searchMediaPlayer: vi.fn(),
        seekMediaPlayer: vi.fn(),
        selectMediaPlayerSoundMode: vi.fn(),
        selectMediaPlayerSource: vi.fn(),
        sendRemoteCommand: sendRemoteCommandMock,
        updateMediaPlayerPower: updateMediaPlayerPowerMock,
      },
    });
  });

  it('returns provider-normalized browse results', async () => {
    browseMediaPlayerMock.mockResolvedValue({
      title: 'Library',
      mediaClass: 'directory',
      mediaContentId: 'library',
      mediaContentType: 'music',
      canExpand: true,
      children: [
        {
          title: 'Daily Mix',
          mediaClass: 'playlist',
          mediaContentId: 'spotify:playlist:daily',
          mediaContentType: 'playlist',
          canPlay: true,
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
      children: [
        {
          title: 'Daily Mix',
          mediaClass: 'playlist',
          mediaContentId: 'spotify:playlist:daily',
          mediaContentType: 'playlist',
          canPlay: true,
          thumbnail: '/api/image',
        },
      ],
    });
  });

  it('returns provider-normalized media source fields', async () => {
    resolveMediaSourceMock.mockResolvedValue({
      url: '/media/local/photo.jpg',
      mimeType: 'image/jpeg',
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
    await expect(
      integrationMediaFeatureService.fetchMediaThumbnailDataUrl('media_player.kitchen')
    ).resolves.toBe('data:image/png;base64,abc123');
  });

  it('routes media power and remote commands through the provider feature boundary', async () => {
    await integrationMediaFeatureService.updateMediaPlayerPower('media_player.kitchen', 'off');
    await integrationMediaFeatureService.sendRemoteCommand('remote.kitchen', 'MEDIA_PLAY_PAUSE');

    expect(updateMediaPlayerPowerMock).toHaveBeenCalledWith('media_player.kitchen', 'off');
    expect(sendRemoteCommandMock).toHaveBeenCalledWith('remote.kitchen', 'MEDIA_PLAY_PAUSE');
  });
});
