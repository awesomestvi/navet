import { useEffect, useState } from 'react';
import { fetchMediaThumbnailDataUrl } from '@/app/features/media/utils/media-thumbnail';
import type { ThemeType } from '@/app/hooks/use-theme';
import { useAuth } from '@/app/stores/auth-store';
import { authSelectors } from '@/app/stores/selectors';
import { resolveArtworkPalette } from './media-artwork-palette';

export interface MediaArtworkPalette {
  dominant: string;
  vibrant: string;
  darkMuted: string;
  highlight: string;
  gradientEnd: string;
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

export function withAlpha(color: string, alpha: number) {
  const values = color.match(/\d+(\.\d+)?/g);
  if (!values || values.length < 3) return color;
  const [r, g, b] = values;
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function useMediaArtworkColors(
  artwork: string | null | undefined,
  theme: ThemeType,
  entityId?: string,
  artworkKey?: string
) {
  const authConfig = useAuth(authSelectors.config);
  const [colors, setColors] = useState<MediaArtworkPalette>(FALLBACK_COLORS[theme]);
  const requestKey = [entityId, artwork, artworkKey].filter(Boolean).join('::');

  useEffect(() => {
    if (!artwork) {
      setColors(FALLBACK_COLORS[theme]);
      return;
    }

    const cachedPalette = paletteCache.get(requestKey);
    if (cachedPalette) {
      setColors(cachedPalette);
      return;
    }

    setColors(FALLBACK_COLORS[theme]);

    let cancelled = false;
    const existingRequest = pendingPaletteRequests.get(requestKey);
    const paletteRequest =
      existingRequest ??
      (async () => {
        if (entityId) {
          const thumbnailDataUrl = await fetchMediaThumbnailDataUrl(entityId).catch(() => null);
          if (thumbnailDataUrl) {
            const thumbnailPalette = await resolveArtworkPalette(
              thumbnailDataUrl,
              authConfig?.url,
              authConfig?.token
            ).catch(() => null);
            if (thumbnailPalette) {
              return thumbnailPalette;
            }
          }
        }

        return resolveArtworkPalette(artwork, authConfig?.url, authConfig?.token);
      })().finally(() => {
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
  }, [artwork, authConfig?.token, authConfig?.url, entityId, requestKey, theme]);

  return colors;
}
