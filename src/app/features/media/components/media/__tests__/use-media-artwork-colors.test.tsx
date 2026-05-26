import { renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useMediaArtworkColors } from '../use-media-artwork-colors';

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
      useMediaArtworkColors('data:image/jpeg;base64,track-a', 'glass', 'media_player.kitchen')
    );

    await waitFor(() => {
      expect(result.current.dominant).toBe('rgb(120, 100, 90)');
    });
    expect(resolveArtworkPaletteMock).toHaveBeenCalledWith('data:image/jpeg;base64,track-a');
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
      useMediaArtworkColors('blob:http://navet.local/album-art', 'glass', 'media_player.living')
    );

    await waitFor(() => {
      expect(result.current.dominant).toBe('rgb(80, 90, 100)');
    });
    expect(resolveArtworkPaletteMock).toHaveBeenCalledWith('blob:http://navet.local/album-art');
  });

  it('keeps fallback colors when resolved artwork cannot be sampled', async () => {
    resolveArtworkPaletteMock.mockResolvedValue(null);

    const { result } = renderHook(() =>
      useMediaArtworkColors(
        'http://homeassistant.local:8123/api/media_player_proxy/media_player.kitchen',
        'glass',
        'media_player.bathroom'
      )
    );

    await waitFor(() => {
      expect(resolveArtworkPaletteMock).toHaveBeenCalled();
    });
    expect(result.current.dominant).toBe('rgb(62, 62, 66)');
  });
});
