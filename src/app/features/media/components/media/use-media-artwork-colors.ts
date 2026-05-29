import { useEffect, useState } from 'react';
import type { ThemeType } from '@/app/hooks/use-theme';
import type { ResolvedPlatformResource } from '@/app/platform/resources';
import { resolveArtworkPalette } from './media-artwork-palette';

export interface MediaArtworkPalette {
  dominant: string;
  vibrant: string;
  darkMuted: string;
  highlight: string;
  gradientEnd: string;
}

export interface MediaArtworkPaletteSource {
  url?: string | null;
  cacheKey?: string;
  authStrategy?: ResolvedPlatformResource['authStrategy'];
  source?: string;
}

const FALLBACK_COLORS: Record<ThemeType, MediaArtworkPalette> = {
  light: {
    dominant: 'rgb(203, 213, 225)',
    vibrant: 'rgb(148, 163, 184)',
    darkMuted: 'rgb(100, 116, 139)',
    highlight: 'rgb(241, 245, 249)',
    gradientEnd: 'rgb(148, 163, 184)',
  },
  dark: {
    dominant: 'rgb(39, 39, 42)',
    vibrant: 'rgb(113, 113, 122)',
    darkMuted: 'rgb(24, 24, 27)',
    highlight: 'rgb(228, 228, 231)',
    gradientEnd: 'rgb(24, 24, 27)',
  },
  black: {
    dominant: 'rgb(12, 12, 12)',
    vibrant: 'rgb(96, 96, 96)',
    darkMuted: 'rgb(0, 0, 0)',
    highlight: 'rgb(255, 255, 255)',
    gradientEnd: 'rgb(0, 0, 0)',
  },
  glass: {
    dominant: 'rgb(62, 62, 66)',
    vibrant: 'rgb(168, 168, 176)',
    darkMuted: 'rgb(36, 36, 40)',
    highlight: 'rgb(244, 244, 245)',
    gradientEnd: 'rgb(28, 28, 32)',
  },
};

const paletteCache = new Map<string, MediaArtworkPalette>();
const pendingPaletteRequests = new Map<string, Promise<MediaArtworkPalette | null>>();
const ARTWORK_PALETTE_CLEAR_DELAY_MS = 700;

export function getMediaArtworkPaletteSource(
  artwork: string | null | undefined,
  artworkResource?: ResolvedPlatformResource | null
): MediaArtworkPaletteSource | null {
  if (!artwork) {
    return null;
  }

  if (artworkResource?.url === artwork) {
    return {
      url: artwork,
      cacheKey: artworkResource.cacheKey,
      authStrategy: artworkResource.authStrategy,
      source: artworkResource.metadata?.source,
    };
  }

  return {
    url: artwork,
    authStrategy: 'none',
  };
}

export function withAlpha(color: string, alpha: number) {
  const hexValue = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexValue) {
    const normalized =
      hexValue[1].length === 3
        ? hexValue[1]
            .split('')
            .map((channel) => `${channel}${channel}`)
            .join('')
        : hexValue[1];
    const r = Number.parseInt(normalized.slice(0, 2), 16);
    const g = Number.parseInt(normalized.slice(2, 4), 16);
    const b = Number.parseInt(normalized.slice(4, 6), 16);

    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  const values = color.match(/\d+(\.\d+)?/g);
  if (!values || values.length < 3) return color;
  const [r, g, b] = values;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useMediaArtworkColors(
  artworkSource: MediaArtworkPaletteSource | null | undefined,
  theme: ThemeType,
  entityId?: string,
  artworkKey?: string
) {
  const [colors, setColors] = useState<MediaArtworkPalette>(FALLBACK_COLORS[theme]);
  const artworkUrl = artworkSource?.url ?? null;
  const requestKey = [entityId, artworkSource?.cacheKey ?? artworkUrl, artworkKey]
    .filter(Boolean)
    .join('::');

  useEffect(() => {
    if (!artworkUrl) {
      const timeoutId = window.setTimeout(() => {
        setColors(FALLBACK_COLORS[theme]);
      }, ARTWORK_PALETTE_CLEAR_DELAY_MS);

      return () => {
        window.clearTimeout(timeoutId);
      };
    }

    const fallbackColors = FALLBACK_COLORS[theme];
    setColors((currentColors) =>
      currentColors === FALLBACK_COLORS.light ||
      currentColors === FALLBACK_COLORS.dark ||
      currentColors === FALLBACK_COLORS.glass ||
      currentColors === FALLBACK_COLORS.black
        ? fallbackColors
        : currentColors
    );

    if (requestKey.length === 0) {
      return;
    }

    const cachedPalette = paletteCache.get(requestKey);
    if (cachedPalette) {
      setColors(cachedPalette);
      return;
    }

    let cancelled = false;
    const existingRequest = pendingPaletteRequests.get(requestKey);
    const paletteRequest =
      existingRequest ??
      resolveArtworkPalette(artworkSource).finally(() => {
        pendingPaletteRequests.delete(requestKey);
      });

    if (!existingRequest) {
      pendingPaletteRequests.set(requestKey, paletteRequest);
    }

    void paletteRequest.then((nextColors) => {
      if (!nextColors || cancelled) return;
      paletteCache.set(requestKey, nextColors);
      setColors(nextColors);
    });

    return () => {
      cancelled = true;
    };
  }, [artworkSource, artworkUrl, requestKey, theme]);

  return colors;
}
