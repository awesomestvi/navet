import { waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useAuthStore } from '@/app/stores/auth-store';
import { renderHookWithProviders } from '@/test/render';

const { fetchMediaThumbnailDataUrlMock } = vi.hoisted(() => ({
  fetchMediaThumbnailDataUrlMock: vi.fn(),
}));

vi.mock('@/app/features/media/utils/media-thumbnail', () => ({
  fetchMediaThumbnailDataUrl: fetchMediaThumbnailDataUrlMock,
}));

import { useMediaArtworkResolution } from '../use-media-artwork-resolution';

describe('useMediaArtworkResolution', () => {
  beforeEach(() => {
    fetchMediaThumbnailDataUrlMock.mockReset();
    vi.restoreAllMocks();
    window.__NAVET_PANEL__ = false;
    useAuthStore.setState({
      config: null,
      isAuthenticated: false,
    });
  });

  it('uses authenticated websocket thumbnail data for Home Assistant media proxy artwork', async () => {
    fetchMediaThumbnailDataUrlMock.mockResolvedValue('data:image/jpeg;base64,album-art');

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: 'media_player.kitchen',
        liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    expect(result.current.albumArt).toBeNull();

    await waitFor(() => {
      expect(result.current.albumArt).toBe('data:image/jpeg;base64,album-art');
    });
    expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledWith('media_player.kitchen');
  });

  it('does not fall back to protected media proxy URLs when thumbnail loading fails', async () => {
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: 'media_player.kitchen',
        liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    await waitFor(() => {
      expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledWith('media_player.kitchen');
    });
    expect(result.current.albumArt).toBeNull();
  });

  it('falls back to an authenticated object URL when websocket thumbnails are unavailable', async () => {
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://navet.local/album-art');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('image', {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      })
    );

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: 'media_player.kitchen',
        liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    await waitFor(() => {
      expect(result.current.albumArt).toBe('blob:http://navet.local/album-art');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        headers: { Authorization: 'Bearer session-token' },
      }
    );
  });

  it('does not use the Home Assistant dev proxy for authenticated artwork fetches in panel mode', async () => {
    window.__NAVET_PANEL__ = true;
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://navet.local/panel-album-art');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('image', {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      })
    );

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: 'media_player.kitchen',
        liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    await waitFor(() => {
      expect(result.current.albumArt).toBe('blob:http://navet.local/panel-album-art');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        headers: { Authorization: 'Bearer session-token' },
      }
    );
  });

  it('reloads authenticated artwork when the track key changes but the proxy URL stays stable', async () => {
    fetchMediaThumbnailDataUrlMock
      .mockResolvedValueOnce('data:image/jpeg;base64,first-track')
      .mockResolvedValueOnce('data:image/jpeg;base64,second-track');

    const { result, rerender } = renderHookWithProviders(
      ({ liveArtworkKey }: { liveArtworkKey: string }) =>
        useMediaArtworkResolution({
          entityId: 'media_player.kitchen',
          liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
          liveArtworkKey,
          homeAssistantUrl: 'http://homeassistant.local:8123',
        }),
      { initialProps: { liveArtworkKey: 'first-title::first-artist' } }
    );

    await waitFor(() => {
      expect(result.current.albumArt).toBe('data:image/jpeg;base64,first-track');
    });

    rerender({ liveArtworkKey: 'second-title::second-artist' });

    await waitFor(() => {
      expect(result.current.albumArt).toBe('data:image/jpeg;base64,second-track');
    });
    expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledTimes(2);
  });

  it('reloads authenticated artwork when only the entity update timestamp changes', async () => {
    fetchMediaThumbnailDataUrlMock
      .mockResolvedValueOnce('data:image/jpeg;base64,first-update')
      .mockResolvedValueOnce('data:image/jpeg;base64,second-update');

    const { result, rerender } = renderHookWithProviders(
      ({ artworkVersionKey }: { artworkVersionKey: string }) =>
        useMediaArtworkResolution({
          entityId: 'media_player.kitchen',
          liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
          liveArtworkKey: 'stable-content-id',
          artworkVersionKey,
          homeAssistantUrl: 'http://homeassistant.local:8123',
        }),
      { initialProps: { artworkVersionKey: '2026-05-17T20:00:00.000Z' } }
    );

    await waitFor(() => {
      expect(result.current.albumArt).toBe('data:image/jpeg;base64,first-update');
    });

    rerender({ artworkVersionKey: '2026-05-17T20:01:00.000Z' });

    await waitFor(() => {
      expect(result.current.albumArt).toBe('data:image/jpeg;base64,second-update');
    });
    expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledTimes(2);
  });
});
