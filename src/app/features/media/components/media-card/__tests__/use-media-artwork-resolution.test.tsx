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

function installRuntimeProxyConfig() {
  window.__NAVET_CONFIG__ = {
    hassUrl: 'http://homeassistant.local:8123',
    hassToken: 'runtime-token',
    proxyBaseUrl: '/__navet_ha_proxy__',
  };
}

describe('useMediaArtworkResolution', () => {
  beforeEach(() => {
    fetchMediaThumbnailDataUrlMock.mockReset();
    vi.restoreAllMocks();
    window.__NAVET_PANEL__ = false;
    window.__NAVET_CONFIG__ = undefined;
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

  it('uses websocket thumbnail data before panel-mode media proxy fallback artwork', async () => {
    window.__NAVET_PANEL__ = true;
    fetchMediaThumbnailDataUrlMock.mockResolvedValue('data:image/jpeg;base64,panel-album-art');

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: 'media_player.kitchen',
        liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    await waitFor(() => {
      expect(result.current.albumArt).toBe('data:image/jpeg;base64,panel-album-art');
    });
    expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledWith('media_player.kitchen');
  });

  it('does not fall back to raw Home Assistant media proxy artwork in local dev', async () => {
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: 'media_player.kitchen',
        liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    expect(result.current.albumArt).toBeNull();
    await waitFor(() => {
      expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledWith('media_player.kitchen');
    });
    expect(result.current.albumArt).toBeNull();
  });

  it('falls back to same-origin media proxy artwork in panel mode when thumbnail loading fails', async () => {
    window.__NAVET_PANEL__ = true;
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch failed'));

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
    expect(result.current.albumArt).toBe('/api/media_player_proxy/media_player.kitchen');
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        credentials: 'same-origin',
        headers: undefined,
      }
    );
  });

  it('loads same-origin panel artwork as an object URL when no auth token is stored', async () => {
    window.__NAVET_PANEL__ = true;
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
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
        credentials: 'same-origin',
        headers: undefined,
      }
    );
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
      'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        credentials: 'same-origin',
        headers: { Authorization: 'Bearer session-token' },
      }
    );
  });

  it('fetches relative Home Assistant media proxy artwork through the Docker proxy', async () => {
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://navet.local/docker-album-art');
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
      expect(result.current.albumArt).toBe('blob:http://navet.local/docker-album-art');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        credentials: 'same-origin',
        headers: { Authorization: 'Bearer session-token' },
      }
    );
  });

  it('fetches Docker proxy artwork without a browser-side auth token', async () => {
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(
      'blob:http://navet.local/docker-proxy-token-album-art'
    );
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
      expect(result.current.albumArt).toBe('blob:http://navet.local/docker-proxy-token-album-art');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        credentials: 'same-origin',
        headers: undefined,
      }
    );
  });

  it('fetches absolute Home Assistant media proxy artwork through the Docker proxy', async () => {
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(
      'blob:http://navet.local/docker-absolute-album-art'
    );
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
        liveEntityPicture:
          'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    await waitFor(() => {
      expect(result.current.albumArt).toBe('blob:http://navet.local/docker-absolute-album-art');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        credentials: 'same-origin',
        headers: { Authorization: 'Bearer session-token' },
      }
    );
  });

  it('keeps Docker proxy artwork as fallback when authenticated fetch fails', async () => {
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('fetch failed'));

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: 'media_player.kitchen',
        liveEntityPicture:
          'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    await waitFor(() => {
      expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledWith('media_player.kitchen');
    });
    expect(result.current.albumArt).toBe(
      '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen'
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
        credentials: 'same-origin',
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
