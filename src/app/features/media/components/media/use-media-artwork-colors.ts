import { useEffect, useState } from 'react';
import { useAuth } from '@/app/contexts/auth-context';
import type { ThemeType } from '@/app/hooks/use-theme';
import {
  isMediaPlayerProxyUrl,
  resolveHomeAssistantProxyUrl,
} from '@/app/utils/home-assistant-url';

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

function toRgbString([red, green, blue]: [number, number, number]) {
  return `rgb(${Math.round(red)}, ${Math.round(green)}, ${Math.round(blue)})`;
}

function clampChannel(value: number) {
  return Math.max(0, Math.min(255, value));
}

function darken([red, green, blue]: [number, number, number], amount: number) {
  return [
    clampChannel(red * (1 - amount)),
    clampChannel(green * (1 - amount)),
    clampChannel(blue * (1 - amount)),
  ] as [number, number, number];
}

function brighten([red, green, blue]: [number, number, number], amount: number) {
  return [
    clampChannel(red + amount),
    clampChannel(green + amount),
    clampChannel(blue + amount),
  ] as [number, number, number];
}

function desaturate([red, green, blue]: [number, number, number], amount: number) {
  const luminance = 0.2126 * red + 0.7152 * green + 0.0722 * blue;

  return [
    red + (luminance - red) * amount,
    green + (luminance - green) * amount,
    blue + (luminance - blue) * amount,
  ] as [number, number, number];
}

function blend(from: [number, number, number], to: [number, number, number], ratio: number) {
  return [
    from[0] + (to[0] - from[0]) * ratio,
    from[1] + (to[1] - from[1]) * ratio,
    from[2] + (to[2] - from[2]) * ratio,
  ] as [number, number, number];
}

function getLuminance([red, green, blue]: [number, number, number]) {
  return (0.2126 * red + 0.7152 * green + 0.0722 * blue) / 255;
}

function getSaturation([red, green, blue]: [number, number, number]) {
  const maxChannel = Math.max(red, green, blue);
  const minChannel = Math.min(red, green, blue);
  return (maxChannel - minChannel) / 255;
}

export function withAlpha(color: string, alpha: number) {
  const values = color.match(/\d+(\.\d+)?/g);
  if (!values || values.length < 3) {
    return color;
  }

  const [red, green, blue] = values;
  return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
}

interface QuantizedBucket {
  count: number;
  redTotal: number;
  greenTotal: number;
  blueTotal: number;
  saturationTotal: number;
  luminanceTotal: number;
}

interface PaletteCandidate {
  color: [number, number, number];
  count: number;
  saturation: number;
  luminance: number;
}

function pickCandidate(
  candidates: PaletteCandidate[],
  scorer: (candidate: PaletteCandidate) => number
) {
  let bestCandidate: PaletteCandidate | null = null;
  let bestScore = -1;

  for (const candidate of candidates) {
    const score = scorer(candidate);
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = candidate;
    }
  }

  return bestCandidate;
}

function createPaletteFromImageData(imageData: ImageData) {
  const buckets = new Map<string, QuantizedBucket>();
  const { data } = imageData;

  for (let index = 0; index < data.length; index += 4) {
    const alpha = data[index + 3];
    if (alpha < 96) {
      continue;
    }

    const color: [number, number, number] = [data[index], data[index + 1], data[index + 2]];
    const luminance = getLuminance(color);
    const saturation = getSaturation(color);

    if (luminance > 0.985 || luminance < 0.02) {
      continue;
    }

    const key = [
      Math.round(color[0] / 28),
      Math.round(color[1] / 28),
      Math.round(color[2] / 28),
    ].join('-');
    const bucket = buckets.get(key) ?? {
      count: 0,
      redTotal: 0,
      greenTotal: 0,
      blueTotal: 0,
      saturationTotal: 0,
      luminanceTotal: 0,
    };

    bucket.count += 1;
    bucket.redTotal += color[0];
    bucket.greenTotal += color[1];
    bucket.blueTotal += color[2];
    bucket.saturationTotal += saturation;
    bucket.luminanceTotal += luminance;

    buckets.set(key, bucket);
  }

  const candidates = Array.from(buckets.values()).map((bucket) => {
    const color: [number, number, number] = [
      bucket.redTotal / bucket.count,
      bucket.greenTotal / bucket.count,
      bucket.blueTotal / bucket.count,
    ];

    return {
      color,
      count: bucket.count,
      saturation: bucket.saturationTotal / bucket.count,
      luminance: bucket.luminanceTotal / bucket.count,
    } satisfies PaletteCandidate;
  });

  if (candidates.length === 0) {
    return null;
  }

  const dominantCandidate =
    pickCandidate(candidates, (candidate) => {
      let score =
        candidate.count *
        (0.54 + candidate.saturation * 1.5) *
        Math.max(0.26, 1 - Math.abs(candidate.luminance - 0.58));

      if (candidate.luminance > 0.93) {
        score *= 0.2;
      }

      if (candidate.luminance < 0.07) {
        score *= 0.32;
      }

      return score;
    }) ?? candidates[0];

  const vibrantCandidate =
    pickCandidate(candidates, (candidate) => {
      const luminanceBalance = 1 - Math.abs(candidate.luminance - 0.48);
      return (
        candidate.count * (0.45 + candidate.saturation * 2.25) * Math.max(0.18, luminanceBalance)
      );
    }) ?? dominantCandidate;

  const highlightCandidate =
    pickCandidate(candidates, (candidate) => {
      const brightnessWeight = Math.max(0.12, candidate.luminance);
      return candidate.count * brightnessWeight * (0.42 + candidate.saturation * 1.35);
    }) ?? vibrantCandidate;

  const dominantSource = blend(dominantCandidate.color, vibrantCandidate.color, 0.16);
  const dominant = blend(dominantSource, highlightCandidate.color, 0.06);
  const vibrant = brighten(desaturate(vibrantCandidate.color, 0.04), 8);
  const darkMuted = darken(
    desaturate(blend(dominantSource, vibrantCandidate.color, 0.14), 0.12),
    0.34
  );
  const highlight = brighten(blend(highlightCandidate.color, vibrantCandidate.color, 0.22), 14);
  const gradientEnd = darken(blend(darkMuted, dominant, 0.12), 0.14);

  return {
    dominant: toRgbString(dominant),
    vibrant: toRgbString(vibrant),
    darkMuted: toRgbString(darkMuted),
    highlight: toRgbString(highlight),
    gradientEnd: toRgbString(gradientEnd),
  } satisfies MediaArtworkPalette;
}

function loadImageData(imageUrl: string, crossOrigin?: 'anonymous') {
  return new Promise<ImageData>((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';

    if (crossOrigin) {
      image.crossOrigin = crossOrigin;
    }

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d', { willReadFrequently: true });

        if (!context) {
          reject(new Error('Canvas context unavailable'));
          return;
        }

        const width = 48;
        const height = 48;
        canvas.width = width;
        canvas.height = height;
        context.drawImage(image, 0, 0, width, height);
        resolve(context.getImageData(0, 0, width, height));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to sample image data'));
      }
    };

    image.onerror = () => {
      reject(new Error('Failed to load artwork'));
    };

    image.src = imageUrl;
  });
}

async function samplePaletteFromImageUrl(imageUrl: string) {
  const isObjectUrl = imageUrl.startsWith('blob:') || imageUrl.startsWith('data:');
  const imageData = await loadImageData(imageUrl, isObjectUrl ? undefined : 'anonymous');
  return createPaletteFromImageData(imageData);
}

async function fetchArtworkObjectUrl(imageUrl: string, token?: string) {
  const headers = token ? { Authorization: `Bearer ${token}` } : undefined;
  const response = await fetch(imageUrl, {
    headers,
    mode: 'cors',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch artwork: ${response.status}`);
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('Artwork response is not an image');
  }

  return URL.createObjectURL(blob);
}

async function resolveArtworkPalette(imageUrl: string, hassUrl?: string, token?: string) {
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return samplePaletteFromImageUrl(imageUrl).catch(() => null);
  }

  if (!import.meta.env.DEV && isMediaPlayerProxyUrl(imageUrl)) {
    const proxiedArtworkUrl = resolveHomeAssistantProxyUrl(imageUrl, hassUrl);
    if (!proxiedArtworkUrl || proxiedArtworkUrl === imageUrl) {
      return null;
    }

    const proxiedObjectUrl = await fetchArtworkObjectUrl(proxiedArtworkUrl).catch(() => null);
    if (!proxiedObjectUrl) {
      return null;
    }

    try {
      return await samplePaletteFromImageUrl(proxiedObjectUrl);
    } finally {
      URL.revokeObjectURL(proxiedObjectUrl);
    }
  }

  const directPalette = await samplePaletteFromImageUrl(imageUrl).catch(() => null);
  if (directPalette) {
    return directPalette;
  }

  const objectUrl = await fetchArtworkObjectUrl(imageUrl, token).catch(() => null);
  if (!objectUrl) {
    return null;
  }

  try {
    return await samplePaletteFromImageUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function useMediaArtworkColors(
  artwork: string | null | undefined,
  theme: ThemeType,
  artworkKey?: string
) {
  const { config: authConfig } = useAuth();
  const [colors, setColors] = useState<MediaArtworkPalette>(FALLBACK_COLORS[theme]);
  const requestKey = [artwork, artworkKey].filter(Boolean).join('::');

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
      resolveArtworkPalette(artwork, authConfig?.url, authConfig?.token).finally(() => {
        pendingPaletteRequests.delete(requestKey);
      });

    if (!existingRequest) {
      pendingPaletteRequests.set(requestKey, paletteRequest);
    }

    void paletteRequest.then((nextColors) => {
      if (!nextColors || cancelled) {
        return;
      }

      paletteCache.set(requestKey, nextColors);
      setColors(nextColors);
    });

    return () => {
      cancelled = true;
    };
  }, [artwork, authConfig?.token, authConfig?.url, requestKey, theme]);

  return colors;
}
