import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { getMediaArtworkPaletteSource, useMediaArtworkColors } from '../use-media-artwork-colors';

const { resolveArtworkPaletteMock } = vi.hoisted(() => ({
  resolveArtworkPaletteMock: vi.fn(),
}));

vi.mock('../media-artwork-palette', () => ({
  resolveArtworkPalette: resolveArtworkPaletteMock,
}));

describe('useMediaArtworkColors', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
    resolveArtworkPaletteMock.mockReset();
  });

  it('samples an already resolved data URL artwork source', async () => {
    resolveArtworkPaletteMock.mockResolvedValue({
      dominant: 'rgb(120, 100, 90)',
      vibrant: 'rgb(170, 120, 90)',
      darkMuted: 'rgb(30, 24, 22)',
      highlight: 'rgb(230, 210, 190)',
      gradientEnd: 'rgb(40, 32, 30)',
    });

    const { result } = renderHook(() =>
      useMediaArtworkColors(
        { url: 'data:image/jpeg;base64,track-a', authStrategy: 'none' },
        'glass',
        'media_player.kitchen'
      )
    );

    await waitFor(() => {
      expect(result.current.dominant).toBe('rgb(120, 100, 90)');
    });
    expect(resolveArtworkPaletteMock).toHaveBeenCalledWith({
      url: 'data:image/jpeg;base64,track-a',
      authStrategy: 'none',
    });
  });

  it('samples an already resolved blob artwork source', async () => {
    resolveArtworkPaletteMock.mockResolvedValue({
      dominant: 'rgb(80, 90, 100)',
      vibrant: 'rgb(120, 130, 150)',
      darkMuted: 'rgb(18, 20, 24)',
      highlight: 'rgb(210, 220, 230)',
      gradientEnd: 'rgb(24, 28, 34)',
    });

    const { result } = renderHook(() =>
      useMediaArtworkColors(
        {
          url: 'blob:http://navet.local/album-art',
          cacheKey: 'media_player.living::blob:http://navet.local/album-art',
          authStrategy: 'none',
        },
        'glass',
        'media_player.living'
      )
    );

    await waitFor(() => {
      expect(result.current.dominant).toBe('rgb(80, 90, 100)');
    });
    expect(resolveArtworkPaletteMock).toHaveBeenCalledWith({
      url: 'blob:http://navet.local/album-art',
      cacheKey: 'media_player.living::blob:http://navet.local/album-art',
      authStrategy: 'none',
    });
  });

  it('keeps fallback colors when resolved artwork cannot be sampled', async () => {
    resolveArtworkPaletteMock.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useMediaArtworkColors(
        {
          url: 'blob:http://navet.local/resolved-artwork',
          cacheKey: 'media_player.bathroom::track-a',
          authStrategy: 'none',
          source: 'artwork_object_url',
        },
        'glass',
        'media_player.bathroom'
      )
    );

    await waitFor(() => {
      expect(resolveArtworkPaletteMock).toHaveBeenCalled();
    });
    expect(result.current.dominant).toBe('rgb(142, 136, 126)');
  });

  it('tries primary media-player thumbnail artwork before proxy fallback', async () => {
    resolveArtworkPaletteMock.mockResolvedValue({
      dominant: 'rgb(24, 18, 16)',
      vibrant: 'rgb(76, 52, 44)',
      darkMuted: 'rgb(12, 10, 10)',
      highlight: 'rgb(226, 206, 196)',
      gradientEnd: 'rgb(18, 14, 14)',
    });

    const paletteSource = getMediaArtworkPaletteSource('data:image/jpeg;base64,thumbnail-art', {
      id: 'media_player.kitchen:thumbnail',
      kind: 'image',
      url: 'data:image/jpeg;base64,thumbnail-art',
      cacheKey: 'media_player.kitchen::track-a',
      authStrategy: 'none',
      metadata: { source: 'media_player_thumbnail' },
      fallback: {
        id: 'media_player.kitchen',
        kind: 'image',
        url: '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen',
        cacheKey: 'media_player.kitchen::track-a',
        authStrategy: 'same_origin',
        metadata: { source: 'ha_proxy_relative' },
      },
    });

    const { result } = renderHook(() =>
      useMediaArtworkColors(paletteSource, 'glass', 'media_player.kitchen', 'thumbnail-primary')
    );

    await waitFor(() => {
      expect(result.current.dominant).toBe('rgb(24, 18, 16)');
    });
    expect(resolveArtworkPaletteMock).toHaveBeenCalledTimes(1);
    expect(resolveArtworkPaletteMock).toHaveBeenCalledWith({
      url: 'data:image/jpeg;base64,thumbnail-art',
      cacheKey: 'media_player.kitchen::track-a',
      authStrategy: 'none',
      source: 'media_player_thumbnail',
      fallback: {
        url: '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen',
        cacheKey: 'media_player.kitchen::track-a',
        authStrategy: 'same_origin',
        source: 'ha_proxy_relative',
      },
    });
  });

  it('falls back to proxy artwork only if primary palette sampling fails', async () => {
    resolveArtworkPaletteMock.mockResolvedValueOnce(null).mockResolvedValueOnce({
      dominant: 'rgb(20, 18, 16)',
      vibrant: 'rgb(55, 44, 36)',
      darkMuted: 'rgb(8, 6, 5)',
      highlight: 'rgb(200, 180, 160)',
      gradientEnd: 'rgb(16, 13, 12)',
    });

    const paletteSource = getMediaArtworkPaletteSource('data:image/jpeg;base64,thumbnail-art', {
      id: 'media_player.kitchen:thumbnail',
      kind: 'image',
      url: 'data:image/jpeg;base64,thumbnail-art',
      cacheKey: 'media_player.kitchen::track-a',
      authStrategy: 'none',
      metadata: { source: 'media_player_thumbnail' },
      fallback: {
        id: 'media_player.kitchen',
        kind: 'image',
        url: '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen',
        cacheKey: 'media_player.kitchen::track-a',
        authStrategy: 'same_origin',
        metadata: { source: 'ha_proxy_relative' },
      },
    });

    const { result } = renderHook(() =>
      useMediaArtworkColors(paletteSource, 'glass', 'media_player.kitchen', 'thumbnail-fallback')
    );

    await waitFor(() => {
      expect(resolveArtworkPaletteMock).toHaveBeenCalledTimes(2);
      expect(result.current.dominant).toBe('rgb(20, 18, 16)');
    });
    expect(resolveArtworkPaletteMock).toHaveBeenNthCalledWith(1, {
      url: 'data:image/jpeg;base64,thumbnail-art',
      cacheKey: 'media_player.kitchen::track-a',
      authStrategy: 'none',
      source: 'media_player_thumbnail',
      fallback: {
        url: '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen',
        cacheKey: 'media_player.kitchen::track-a',
        authStrategy: 'same_origin',
        source: 'ha_proxy_relative',
      },
    });
    expect(resolveArtworkPaletteMock).toHaveBeenNthCalledWith(2, {
      url: '/__navet_ha_proxy__/api/media_player_proxy/media_player.kitchen',
      cacheKey: 'media_player.kitchen::track-a',
      authStrategy: 'same_origin',
      source: 'ha_proxy_relative',
    });
  });
});
