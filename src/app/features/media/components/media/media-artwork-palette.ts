/**
 * Color extraction algorithm for media artwork.
 * Samples a downscaled version of the artwork image, quantizes pixels into
 * color buckets, scores candidates for dominance / vibrancy / highlight, and
 * derives a MediaArtworkPalette from the winning candidates.
 */

import {
  isMediaPlayerProxyUrl,
  resolveHomeAssistantProxyUrl,
} from '@/app/utils/home-assistant-url';
import type { MediaArtworkPalette } from './use-media-artwork-colors';

// --- Color math helpers -------------------------------------------------------

function toRgbString([r, g, b]: [number, number, number]) {
  return `rgb(${Math.round(r)}, ${Math.round(g)}, ${Math.round(b)})`;
}

function clampChannel(v: number) {
  return Math.max(0, Math.min(255, v));
}

function darken([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  return [
    clampChannel(r * (1 - amount)),
    clampChannel(g * (1 - amount)),
    clampChannel(b * (1 - amount)),
  ];
}

function brighten([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  return [clampChannel(r + amount), clampChannel(g + amount), clampChannel(b + amount)];
}

function desaturate([r, g, b]: [number, number, number], amount: number): [number, number, number] {
  const lum = 0.2126 * r + 0.7152 * g + 0.0722 * b;
  return [r + (lum - r) * amount, g + (lum - g) * amount, b + (lum - b) * amount];
}

function blend(
  from: [number, number, number],
  to: [number, number, number],
  ratio: number
): [number, number, number] {
  return [
    from[0] + (to[0] - from[0]) * ratio,
    from[1] + (to[1] - from[1]) * ratio,
    from[2] + (to[2] - from[2]) * ratio,
  ];
}

function getLuminance([r, g, b]: [number, number, number]) {
  return (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255;
}

function getSaturation([r, g, b]: [number, number, number]) {
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

// --- Quantization & palette selection ----------------------------------------

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
  scorer: (c: PaletteCandidate) => number
): PaletteCandidate | null {
  let best: PaletteCandidate | null = null;
  let bestScore = -1;
  for (const c of candidates) {
    const score = scorer(c);
    if (score > bestScore) {
      bestScore = score;
      best = c;
    }
  }
  return best;
}

export function createPaletteFromImageData(imageData: ImageData): MediaArtworkPalette | null {
  const buckets = new Map<string, QuantizedBucket>();
  const { data } = imageData;

  for (let i = 0; i < data.length; i += 4) {
    if (data[i + 3] < 96) continue;
    const color: [number, number, number] = [data[i], data[i + 1], data[i + 2]];
    const luminance = getLuminance(color);
    const saturation = getSaturation(color);
    if (luminance > 0.985 || luminance < 0.02) continue;

    const key = `${Math.round(color[0] / 28)}-${Math.round(color[1] / 28)}-${Math.round(color[2] / 28)}`;
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

  const candidates: PaletteCandidate[] = Array.from(buckets.values()).map((b) => ({
    color: [b.redTotal / b.count, b.greenTotal / b.count, b.blueTotal / b.count] as [
      number,
      number,
      number,
    ],
    count: b.count,
    saturation: b.saturationTotal / b.count,
    luminance: b.luminanceTotal / b.count,
  }));

  if (candidates.length === 0) return null;

  const dominantCandidate =
    pickCandidate(candidates, (c) => {
      let score =
        c.count * (0.54 + c.saturation * 1.5) * Math.max(0.26, 1 - Math.abs(c.luminance - 0.58));
      if (c.luminance > 0.93) score *= 0.2;
      if (c.luminance < 0.07) score *= 0.32;
      return score;
    }) ?? candidates[0];

  const vibrantCandidate =
    pickCandidate(
      candidates,
      (c) =>
        c.count * (0.45 + c.saturation * 2.25) * Math.max(0.18, 1 - Math.abs(c.luminance - 0.48))
    ) ?? dominantCandidate;

  const highlightCandidate =
    pickCandidate(
      candidates,
      (c) => c.count * Math.max(0.12, c.luminance) * (0.42 + c.saturation * 1.35)
    ) ?? vibrantCandidate;

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
  };
}

// --- Image loading & palette resolution --------------------------------------

function loadImageData(imageUrl: string, crossOrigin?: 'anonymous'): Promise<ImageData> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.decoding = 'async';
    if (crossOrigin) image.crossOrigin = crossOrigin;

    image.onload = () => {
      try {
        const canvas = document.createElement('canvas');
        const ctx = canvas.getContext('2d', { willReadFrequently: true });
        if (!ctx) {
          reject(new Error('Canvas context unavailable'));
          return;
        }
        canvas.width = 48;
        canvas.height = 48;
        ctx.drawImage(image, 0, 0, 48, 48);
        resolve(ctx.getImageData(0, 0, 48, 48));
      } catch (error) {
        reject(error instanceof Error ? error : new Error('Failed to sample image data'));
      }
    };
    image.onerror = () => reject(new Error('Failed to load artwork'));
    image.src = imageUrl;
  });
}

async function samplePaletteFromImageUrl(imageUrl: string): Promise<MediaArtworkPalette | null> {
  const isObjectUrl = imageUrl.startsWith('blob:') || imageUrl.startsWith('data:');
  const imageData = await loadImageData(imageUrl, isObjectUrl ? undefined : 'anonymous');
  return createPaletteFromImageData(imageData);
}

async function fetchArtworkObjectUrl(imageUrl: string, token?: string): Promise<string> {
  const response = await fetch(imageUrl, {
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    mode: 'cors',
  });
  if (!response.ok) throw new Error(`Failed to fetch artwork: ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Artwork response is not an image');
  return URL.createObjectURL(blob);
}

export async function resolveArtworkPalette(
  imageUrl: string,
  hassUrl?: string,
  token?: string
): Promise<MediaArtworkPalette | null> {
  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return samplePaletteFromImageUrl(imageUrl).catch(() => null);
  }

  if (!import.meta.env.DEV && isMediaPlayerProxyUrl(imageUrl)) {
    const proxiedUrl = resolveHomeAssistantProxyUrl(imageUrl, hassUrl);
    if (!proxiedUrl || proxiedUrl === imageUrl) return null;
    const objectUrl = await fetchArtworkObjectUrl(proxiedUrl).catch(() => null);
    if (!objectUrl) return null;
    try {
      return await samplePaletteFromImageUrl(objectUrl);
    } finally {
      URL.revokeObjectURL(objectUrl);
    }
  }

  const directPalette = await samplePaletteFromImageUrl(imageUrl).catch(() => null);
  if (directPalette) return directPalette;

  const objectUrl = await fetchArtworkObjectUrl(imageUrl, token).catch(() => null);
  if (!objectUrl) return null;
  try {
    return await samplePaletteFromImageUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
