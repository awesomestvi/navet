import { mediaArtworkService } from '@navet/app/infrastructure/home-assistant/home-assistant-infrastructure';
import { resetRuntimeContextForTests } from '@navet/app/infrastructure/home-assistant/runtime/runtime-detector';
import { mediaPlayerEntityFixtures } from '@navet/app/test/fixtures/home-assistant/entities/media-player';
import { jellyfinFixtures } from '@navet/app/test/fixtures/home-assistant/integrations/jellyfin';
import { renderHookWithProviders } from '@navet/app/test/render';
import { act, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { fetchMediaThumbnailDataUrlMock } = vi.hoisted(() => ({
  fetchMediaThumbnailDataUrlMock: vi.fn(),
}));

vi.mock('@navet/app/features/media/utils/media-thumbnail', () => ({
  fetchMediaThumbnailDataUrl: fetchMediaThumbnailDataUrlMock,
}));

vi.mock('@navet/app/services/home-assistant.service', () => ({
  homeAssistantService: {
    getConnection: vi.fn(),
  },
}));

import { useMediaArtworkResolution } from '../use-media-artwork-resolution';

const ARTWORK_CLEAR_TEST_DELAY_MS = 700;

function installRuntimeProxyConfig() {
  window.__NAVET_CONFIG__ = {
    hassUrl: 'http://homeassistant.local:8123',
    proxyBaseUrl: '/__navet_ha_proxy__',
  };
  resetRuntimeContextForTests();
}

function installIngressBase(addonSlug = 'navet_dev') {
  const base = document.createElement('base');
  base.href = `${window.location.origin}/api/hassio_ingress/${addonSlug}/`;
  document.head.append(base);
  resetRuntimeContextForTests();
}

function expectFetchUrl(fetchMock: ReturnType<typeof vi.spyOn>, expectedUrl: string) {
  expect(fetchMock).toHaveBeenCalled();
  expect(fetchMock.mock.calls[0]?.[0]).toBe(expectedUrl);
}

describe('useMediaArtworkResolution', () => {
  beforeEach(() => {
    document.querySelector('base')?.remove();
    window.history.replaceState(null, '', '/');
    fetchMediaThumbnailDataUrlMock.mockReset();
    vi.restoreAllMocks();
    window.__NAVET_PANEL__ = false;
    window.__NAVET_CONFIG__ = undefined;
    resetRuntimeContextForTests();
    const artworkServiceForTest = mediaArtworkService as unknown as {
      objectUrlCache: Map<string, unknown>;
      negativeCache: Map<string, unknown>;
    };
    artworkServiceForTest.objectUrlCache.clear();
    artworkServiceForTest.negativeCache.clear();
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockResolvedValue({ close: vi.fn() } as unknown as ImageBitmap)
    );
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

    await waitFor(() => {
      expect(result.current.albumArt).toBe('data:image/jpeg;base64,album-art');
    });
    expect(result.current.artworkResource).toMatchObject({
      kind: 'image',
      url: 'data:image/jpeg;base64,album-art',
      authStrategy: 'none',
    });
    expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledWith('media_player.kitchen');
  });

  it('uses websocket thumbnail data before panel-mode media proxy fallback artwork', async () => {
    window.__NAVET_PANEL__ = true;
    resetRuntimeContextForTests();
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

    await waitFor(() => {
      expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledWith('media_player.kitchen');
    });
    await waitFor(() => {
      expect(result.current.albumArt).toBeNull();
    });
    expectFetchUrl(fetchMock, '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen');
  });

  it('falls back to same-origin media proxy artwork in panel mode when thumbnail loading fails', async () => {
    window.__NAVET_PANEL__ = true;
    resetRuntimeContextForTests();
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
    await waitFor(() => {
      expect(result.current.albumArt).toBeNull();
    });
    expectFetchUrl(fetchMock, '/api/media_player_proxy/media_player.kitchen');
  });

  it('loads same-origin panel artwork as an object URL when no auth token is stored', async () => {
    window.__NAVET_PANEL__ = true;
    resetRuntimeContextForTests();
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
    expectFetchUrl(fetchMock, '/api/media_player_proxy/media_player.kitchen');
  });

  it('keeps external artwork URLs direct when Home Assistant does not require proxying', async () => {
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: mediaPlayerEntityFixtures.normal.entity_id,
        liveEntityPicture: 'https://cdn.example.test/album-art.jpg',
        homeAssistantUrl: 'http://homeassistant.local:8123',
      })
    );

    await waitFor(() => {
      expect(result.current.albumArt).toBe('https://cdn.example.test/album-art.jpg');
    });
  });

  it('resolves signed Home Assistant artwork URLs in panel mode without dropping the signature', async () => {
    window.__NAVET_PANEL__ = true;
    resetRuntimeContextForTests();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    vi.spyOn(URL, 'createObjectURL').mockReturnValue('blob:http://navet.local/jellyfin-signed');
    vi.spyOn(URL, 'revokeObjectURL').mockImplementation(() => undefined);
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('image', {
        status: 200,
        headers: { 'Content-Type': 'image/jpeg' },
      })
    );

    const { result } = renderHookWithProviders(() =>
      useMediaArtworkResolution({
        entityId: jellyfinFixtures.player.entity_id,
        liveEntityPicture: jellyfinFixtures.player.attributes.entity_picture as string,
        homeAssistantUrl: 'https://ha.example.test',
      })
    );

    await waitFor(() => {
      expect(result.current.albumArt).toBe('blob:http://navet.local/jellyfin-signed');
    });
    expectFetchUrl(
      fetchMock,
      '/api/media_player_proxy/media_player.jellyfin_tv?authSig=signed-artwork-token'
    );
  });

  it('fetches relative Home Assistant media proxy artwork through the Docker proxy', async () => {
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
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
    expect(result.current.artworkResource).toMatchObject({
      kind: 'image',
      url: 'blob:http://navet.local/docker-album-art',
      authStrategy: 'none',
    });
    expectFetchUrl(fetchMock, '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen');
  });

  it('fetches add-on ingress media proxy artwork through the ingress-aware proxy when runtime HA config exists', async () => {
    installIngressBase();
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
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
    expectFetchUrl(
      fetchMock,
      '/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen'
    );
  });

  it('fetches absolute Home Assistant artwork through the add-on ingress proxy when runtime HA config exists', async () => {
    installIngressBase();
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
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
    expectFetchUrl(
      fetchMock,
      '/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen'
    );
  });

  it('fetches add-on media proxy artwork through the ingress proxy when runtime HA config is empty', async () => {
    installIngressBase();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
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
    expectFetchUrl(
      fetchMock,
      '/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen'
    );
  });

  it('does not render a broken add-on ingress proxy fallback when empty-runtime artwork fetch fails', async () => {
    installIngressBase();
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
    expectFetchUrl(
      fetchMock,
      '/api/hassio_ingress/navet_dev/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen'
    );
    expect(result.current.albumArt).toBeNull();
  });

  it('fetches absolute Home Assistant media proxy artwork through the Docker proxy', async () => {
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
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
    expectFetchUrl(fetchMock, '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen');
  });

  it('does not render a broken Docker proxy artwork fallback when authenticated fetch fails', async () => {
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
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
    expect(result.current.albumArt).toBeNull();
  });

  it('does not render proxy artwork when the response body fails image decode despite returning 200', async () => {
    installIngressBase();
    installRuntimeProxyConfig();
    fetchMediaThumbnailDataUrlMock.mockResolvedValue(null);
    const createImageBitmapMock = vi.fn().mockRejectedValue(new Error('decode failed'));
    vi.stubGlobal('createImageBitmap', createImageBitmapMock);
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(
      new Response('broken image bytes', {
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
      expect(fetchMediaThumbnailDataUrlMock).toHaveBeenCalledWith('media_player.kitchen');
    });
    await waitFor(() => {
      expect(createImageBitmapMock).toHaveBeenCalled();
    });
    expect(result.current.albumArt).toBeNull();
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
    expect(fetchMediaThumbnailDataUrlMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });

  it('keeps the previous authenticated artwork visible while the next track artwork loads', async () => {
    let callCount = 0;
    fetchMediaThumbnailDataUrlMock.mockImplementation(() =>
      callCount++ === 0
        ? Promise.resolve('data:image/jpeg;base64,first-track')
        : new Promise<string>(() => undefined)
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
    await waitFor(() => {
      expect(fetchMediaThumbnailDataUrlMock.mock.calls.length).toBeGreaterThanOrEqual(2);
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

      expect(result.current.albumArt).toBe('data:image/jpeg;base64,first-track');
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
    expect(fetchMediaThumbnailDataUrlMock.mock.calls.length).toBeGreaterThanOrEqual(2);
  });
});
