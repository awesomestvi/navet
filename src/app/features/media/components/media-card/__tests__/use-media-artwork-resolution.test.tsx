import { act, waitFor } from '@testing-library/react';
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

const ARTWORK_CLEAR_TEST_DELAY_MS = 700;

function installRuntimeProxyConfig() {
  window.__NAVET_CONFIG__ = {
    hassUrl: 'http://homeassistant.local:8123',
    hassToken: 'runtime-token',
    proxyBaseUrl: '/__navet_ha_proxy__',
  };
}

function installIngressBase(addonSlug = 'navet_dev') {
  const base = document.createElement('base');
  base.href = `${window.location.origin}/api/hassio_ingress/${addonSlug}/`;
  document.head.append(base);
}

describe('useMediaArtworkResolution', () => {
  beforeEach(() => {
    document.querySelector('base')?.remove();
    window.history.replaceState(null, '', '/');
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

    expect(result.current.albumArt).toBe(
      'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen'
    );

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

  it('uses direct Home Assistant media proxy artwork in local dev when thumbnails are unavailable', async () => {
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('server error'));

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: 'media_player.kitchen',
        liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    expect(result.current.albumArt).toBe(
      'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen'
    );
    await waitFor(() => {
      expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledWith('media_player.kitchen');
    });
    expect(result.current.albumArt).toBe(
      'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen'
    );
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('does not fetch direct Home Assistant media proxy artwork when websocket thumbnails are unavailable', async () => {
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(new Response('server error'));

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
    expect(result.current.albumArt).toBe(
      'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen'
    );
    expect(fetchMock).not.toHaveBeenCalled();
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

  it('fetches add-on ingress media proxy artwork through the ingress-aware proxy when runtime HA config exists', async () => {
    installIngressBase();
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://navet.local/addon-album-art');
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
      expect(result.current.albumArt).toBe('blob:http://navet.local/addon-album-art');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        credentials: 'same-origin',
        headers: { Authorization: 'Bearer session-token' },
      }
    );
  });

  it('fetches absolute Home Assistant artwork through the add-on ingress proxy when runtime HA config exists', async () => {
    installIngressBase();
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(
      'blob:http://navet.local/addon-absolute-album-art'
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
      expect(result.current.albumArt).toBe('blob:http://navet.local/addon-absolute-album-art');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      '/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        credentials: 'same-origin',
        headers: { Authorization: 'Bearer session-token' },
      }
    );
  });

  it('fetches add-on media proxy artwork directly from Home Assistant when runtime HA config is empty', async () => {
    installIngressBase();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
    vi.spyOn(URL, 'createObjectURL').mockReturnValue(
      'blob:http://navet.local/addon-direct-album-art'
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
      expect(result.current.albumArt).toBe('blob:http://navet.local/addon-direct-album-art');
    });
    expect(fetchMock).toHaveBeenCalledWith(
      'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        credentials: 'same-origin',
        headers: { Authorization: 'Bearer session-token' },
      }
    );
    expect(fetchMock).not.toHaveBeenCalledWith(
      expect.stringContaining('/api/hassio_ingress/navet_dev/__navet_ha_proxy__/'),
      expect.anything()
    );
  });

  it('does not keep a broken add-on ingress proxy fallback when empty-runtime artwork fetch fails', async () => {
    installIngressBase();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    useAuthStore.setState({
      config: { url: 'http://homeassistant.local:8123', token: 'session-token' },
      isAuthenticated: true,
    });
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
    expect(fetchMock).toHaveBeenCalledWith(
      'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen?navet_artwork_key=media_player.kitchen',
      {
        credentials: 'same-origin',
        headers: { Authorization: 'Bearer session-token' },
      }
    );
    expect(result.current.albumArt).toBeNull();
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

  it('keeps the previous authenticated artwork visible while the next track artwork loads', async () => {
    let resolveSecondArtwork: (value: string) => void = () => undefined;
    fetchMediaThumbnailDataUrlMock
      .mockResolvedValueOnce('data:image/jpeg;base64,first-track')
      .mockImplementationOnce(
        () =>
          new Promise<string>((resolve) => {
            resolveSecondArtwork = resolve;
          })
      );

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

    expect(result.current.albumArt).toBe('data:image/jpeg;base64,first-track');

    resolveSecondArtwork('data:image/jpeg;base64,second-track');

    await waitFor(() => {
      expect(result.current.albumArt).toBe('data:image/jpeg;base64,second-track');
    });
  });

  it('keeps previous artwork through transient missing entity picture updates', async () => {
    fetchMediaThumbnailDataUrlMock.mockResolvedValue('data:image/jpeg;base64,first-track');

    const { result, rerender } = renderHookWithProviders(
      ({ liveEntityPicture }: { liveEntityPicture?: string }) =>
        useMediaArtworkResolution({
          entityId: 'media_player.kitchen',
          liveEntityPicture,
          liveArtworkKey: 'first-title::first-artist',
          homeAssistantUrl: 'http://homeassistant.local:8123',
        }),
      {
        initialProps: {
          liveEntityPicture: '/api/media_player_proxy/media_player.kitchen',
        } as { liveEntityPicture?: string },
      }
    );

    await waitFor(() => {
      expect(result.current.albumArt).toBe('data:image/jpeg;base64,first-track');
    });

    vi.useFakeTimers();
    try {
      rerender({ liveEntityPicture: undefined });

      expect(result.current.albumArt).toBe('data:image/jpeg;base64,first-track');

      act(() => {
        vi.advanceTimersByTime(ARTWORK_CLEAR_TEST_DELAY_MS - 1);
      });

      expect(result.current.albumArt).toBe('data:image/jpeg;base64,first-track');

      act(() => {
        vi.advanceTimersByTime(1);
      });

      expect(result.current.albumArt).toBeNull();
    } finally {
      vi.useRealTimers();
    }
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
