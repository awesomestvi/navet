/**
 * Color extraction algorithm for media artwork.
 * Samples a downscaled version of the artwork image, quantizes pixels into
 * color buckets, scores candidates for dominance / vibrancy / highlight, and
 * derives a MediaArtworkPalette from the winning candidates.
 */

import type { MediaArtworkPalette, MediaArtworkPaletteSource } from './use-media-artwork-colors';

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

function parseRgbString(color: string): [number, number, number] {
  const match = color.match(/\d+(\.\d+)?/g);
  if (!match || match.length < 3) {
    return [0, 0, 0];
  }

  return [Number.parseFloat(match[0]), Number.parseFloat(match[1]), Number.parseFloat(match[2])];
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
    if (luminance > 0.995 || luminance < 0.02) continue;

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
  const totalSampleCount = candidates.reduce((sum, candidate) => sum + candidate.count, 0);
  const overallLightCoverage =
    totalSampleCount > 0
      ? candidates
          .filter((candidate) => candidate.luminance >= 0.72)
          .reduce((sum, candidate) => sum + candidate.count, 0) / totalSampleCount
      : 0;
  const overallDarkCoverage =
    totalSampleCount > 0
      ? candidates
          .filter((candidate) => candidate.luminance <= 0.42)
          .reduce((sum, candidate) => sum + candidate.count, 0) / totalSampleCount
      : 0;

  const dominantCandidate =
    pickCandidate(candidates, (c) => {
      let score =
        c.count * (0.54 + c.saturation * 1.5) * Math.max(0.26, 1 - Math.abs(c.luminance - 0.58));
      if (c.luminance > 0.93) score *= 0.2;
      if (c.luminance < 0.07) score *= 0.32;
      return score;
    }) ?? candidates[0];
  const darkBackgroundCandidate =
    pickCandidate(candidates, (c) => {
      let score =
        c.count * (0.72 + c.saturation * 0.9) * Math.max(0.18, 1 - Math.abs(c.luminance - 0.24));
      if (c.luminance > 0.58) score *= 0.06;
      else if (c.luminance > 0.46) score *= 0.18;
      if (c.luminance < 0.05) score *= 0.4;
      return score;
    }) ?? dominantCandidate;

  const vibrantCandidate =
    pickCandidate(
      candidates,
      (c) =>
        c.count * (0.45 + c.saturation * 2.25) * Math.max(0.18, 1 - Math.abs(c.luminance - 0.48))
    ) ?? dominantCandidate;
  const accentCandidate =
    pickCandidate(candidates, (c) => {
      if (c.luminance < 0.14 || c.luminance > 0.78) {
        return -1;
      }

      return (
        c.count ** 0.52 *
        (0.2 + c.saturation * 4.6) *
        Math.max(0.28, 1 - Math.abs(c.luminance - 0.42))
      );
    }) ?? vibrantCandidate;

  const highlightCandidate =
    pickCandidate(
      candidates,
      (c) => c.count * Math.max(0.12, c.luminance) * (0.42 + c.saturation * 1.35)
    ) ?? vibrantCandidate;
  const lightNeutralCandidate =
    pickCandidate(candidates, (c) => {
      if (c.luminance < 0.78 || c.saturation > 0.18) {
        return -1;
      }

      return c.count * (1 + c.luminance * 1.8) * Math.max(0.22, 0.24 - c.saturation);
    }) ?? null;
  const lightSurfaceCandidate =
    pickCandidate(candidates, (c) => {
      if (c.luminance < 0.56 || c.saturation > 0.36) {
        return -1;
      }

      return c.count * (0.9 + c.luminance * 1.5) * Math.max(0.18, 0.38 - c.saturation);
    }) ?? null;
  const lightNeutralCoverage =
    lightNeutralCandidate && totalSampleCount > 0
      ? lightNeutralCandidate.count / totalSampleCount
      : 0;
  const accentCoverage = totalSampleCount > 0 ? accentCandidate.count / totalSampleCount : 0;
  const shouldAnchorToDarkBackground =
    darkBackgroundCandidate.luminance <= 0.42 &&
    (overallDarkCoverage >= 0.34 ||
      darkBackgroundCandidate.count >= dominantCandidate.count * 0.72 ||
      darkBackgroundCandidate.luminance <= dominantCandidate.luminance - 0.12 ||
      (lightNeutralCandidate !== null &&
        lightNeutralCoverage < 0.52 &&
        darkBackgroundCandidate.count >= lightNeutralCandidate.count * 0.6));
  const baseCandidate = shouldAnchorToDarkBackground ? darkBackgroundCandidate : dominantCandidate;
  const shouldFavorLightNeutral =
    lightNeutralCandidate !== null &&
    !shouldAnchorToDarkBackground &&
    (lightNeutralCoverage >= 0.4 ||
      (overallLightCoverage >= 0.56 &&
        lightNeutralCandidate.count >= baseCandidate.count * 0.9 &&
        lightNeutralCandidate.luminance >= 0.82));
  const shouldUseNeutralLedPalette =
    lightNeutralCandidate !== null &&
    !shouldAnchorToDarkBackground &&
    (lightNeutralCoverage >= 0.54 ||
      (overallLightCoverage >= 0.68 &&
        lightNeutralCandidate.count >= baseCandidate.count * 1.05 &&
        lightNeutralCandidate.luminance >= 0.84));
  const shouldUseLightSurfaceBase =
    !shouldAnchorToDarkBackground &&
    lightSurfaceCandidate !== null &&
    (overallLightCoverage >= 0.42 || shouldFavorLightNeutral || shouldUseNeutralLedPalette);
  const shouldPreferAccentCandidate =
    !shouldAnchorToDarkBackground &&
    shouldUseLightSurfaceBase &&
    accentCoverage >= 0.006 &&
    accentCandidate.luminance >= 0.14 &&
    accentCandidate.luminance <= 0.62 &&
    accentCandidate.saturation >= 0.34 &&
    accentCandidate.saturation >= vibrantCandidate.saturation + 0.04 &&
    accentCandidate.saturation >= baseCandidate.saturation + 0.12 &&
    (overallLightCoverage >= 0.42 || shouldFavorLightNeutral || shouldUseNeutralLedPalette);
  const shouldPreserveLightSurfaceAccent =
    !shouldAnchorToDarkBackground &&
    shouldUseLightSurfaceBase &&
    lightSurfaceCandidate !== null &&
    accentCoverage >= 0.004 &&
    accentCandidate.luminance >= 0.12 &&
    accentCandidate.luminance <= 0.62 &&
    accentCandidate.saturation >= 0.22 &&
    accentCandidate.saturation >= baseCandidate.saturation + 0.08 &&
    (overallLightCoverage >= 0.46 || lightNeutralCoverage >= 0.3);
  const selectedVibrantCandidate = shouldPreferAccentCandidate ? accentCandidate : vibrantCandidate;

  const dominantSourceBase =
    shouldUseLightSurfaceBase && lightSurfaceCandidate !== null
      ? blend(
          lightSurfaceCandidate.color,
          baseCandidate.color,
          shouldPreferAccentCandidate ? 0.06 : 0.12
        )
      : shouldAnchorToDarkBackground
        ? blend(baseCandidate.color, vibrantCandidate.color, 0.06)
        : blend(baseCandidate.color, vibrantCandidate.color, 0.16);
  const dominantSource = shouldFavorLightNeutral
    ? blend(
        dominantSourceBase,
        lightNeutralCandidate.color,
        shouldUseNeutralLedPalette ? 0.9 : 0.62
      )
    : dominantSourceBase;
  const dominant = blend(
    dominantSource,
    shouldFavorLightNeutral ? lightNeutralCandidate.color : highlightCandidate.color,
    shouldUseNeutralLedPalette
      ? 0.36
      : shouldFavorLightNeutral
        ? 0.16
        : shouldAnchorToDarkBackground
          ? 0.02
          : 0.06
  );
  const baseSourceSaturation = getSaturation(baseCandidate.color);
  const shouldMuteVibrantAccent =
    shouldAnchorToDarkBackground &&
    ((selectedVibrantCandidate.luminance >= baseCandidate.luminance + 0.12 &&
      selectedVibrantCandidate.saturation >= baseSourceSaturation + 0.16) ||
      selectedVibrantCandidate.saturation >= 0.78);
  const vibrantSource = shouldMuteVibrantAccent
    ? blend(selectedVibrantCandidate.color, dominantSource, 0.72)
    : shouldPreserveLightSurfaceAccent
      ? blend(
          accentCandidate.color,
          lightSurfaceCandidate.color,
          shouldPreferAccentCandidate ? 0.04 : 0.08
        )
      : blend(
          selectedVibrantCandidate.color,
          dominantSource,
          shouldAnchorToDarkBackground ? 0.22 : shouldPreferAccentCandidate ? 0.04 : 0.08
        );
  const vibrant = brighten(
    desaturate(
      vibrantSource,
      shouldMuteVibrantAccent
        ? 0.52
        : shouldPreserveLightSurfaceAccent
          ? 0.02
          : shouldAnchorToDarkBackground
            ? 0.14
            : shouldPreferAccentCandidate
              ? 0.02
              : 0.04
    ),
    shouldMuteVibrantAccent
      ? 1
      : shouldPreserveLightSurfaceAccent
        ? 2
        : shouldAnchorToDarkBackground
          ? 4
          : shouldPreferAccentCandidate
            ? 4
            : 8
  );
  const darkMuted = darken(
    desaturate(
      blend(
        dominantSource,
        shouldFavorLightNeutral ? lightNeutralCandidate.color : vibrantCandidate.color,
        shouldUseNeutralLedPalette
          ? 0.18
          : shouldFavorLightNeutral
            ? 0.08
            : shouldAnchorToDarkBackground
              ? 0.06
              : 0.14
      ),
      shouldUseNeutralLedPalette
        ? 0.42
        : shouldFavorLightNeutral
          ? 0.22
          : shouldAnchorToDarkBackground
            ? 0.22
            : 0.12
    ),
    shouldUseNeutralLedPalette
      ? 0.08
      : shouldFavorLightNeutral
        ? 0.22
        : shouldAnchorToDarkBackground
          ? 0.28
          : 0.34
  );
  const highlight = shouldFavorLightNeutral
    ? brighten(
        blend(
          lightNeutralCandidate.color,
          highlightCandidate.color,
          shouldUseNeutralLedPalette ? 0.02 : 0.08
        ),
        shouldUseNeutralLedPalette ? 4 : 10
      )
    : brighten(
        blend(
          highlightCandidate.color,
          shouldAnchorToDarkBackground ? dominantSource : vibrantCandidate.color,
          shouldAnchorToDarkBackground ? 0.32 : 0.22
        ),
        shouldAnchorToDarkBackground ? 10 : 14
      );
  const gradientEnd = shouldUseNeutralLedPalette
    ? darken(blend(darkMuted, dominant, 0.2), 0.04)
    : darken(
        blend(darkMuted, dominant, shouldAnchorToDarkBackground ? 0.08 : 0.12),
        shouldAnchorToDarkBackground ? 0.18 : 0.14
      );
  const resolvedDominant =
    shouldUseLightSurfaceBase && lightSurfaceCandidate !== null
      ? blend(lightSurfaceCandidate.color, dominant, shouldPreferAccentCandidate ? 0.14 : 0.22)
      : dominant;
  const resolvedHighlight =
    shouldUseLightSurfaceBase && lightSurfaceCandidate !== null
      ? brighten(
          blend(lightSurfaceCandidate.color, highlight, shouldPreferAccentCandidate ? 0.08 : 0.14),
          shouldPreferAccentCandidate ? 4 : 8
        )
      : highlight;
  const resolvedGradientEnd =
    shouldUseLightSurfaceBase && lightSurfaceCandidate !== null
      ? darken(
          blend(darkMuted, lightSurfaceCandidate.color, shouldPreferAccentCandidate ? 0.28 : 0.22),
          shouldPreferAccentCandidate ? 0.08 : 0.1
        )
      : gradientEnd;
  const resolvedVibrantBase =
    accentCoverage >= 0.004 &&
    accentCandidate.luminance >= 0.12 &&
    accentCandidate.luminance <= 0.62 &&
    accentCandidate.saturation >= 0.22 &&
    getSaturation(vibrant) < Math.max(0.2, accentCandidate.saturation * 0.66)
      ? brighten(
          desaturate(
            blend(
              accentCandidate.color,
              lightSurfaceCandidate?.color ?? highlightCandidate.color,
              lightNeutralCoverage >= 0.28 ? 0.08 : 0.12
            ),
            0.02
          ),
          2
        )
      : vibrant;
  const resolvedVibrant =
    shouldAnchorToDarkBackground && getSaturation(resolvedVibrantBase) > 0.6
      ? darken(desaturate(resolvedVibrantBase, 0.52), 0.32)
      : resolvedVibrantBase;

  return {
    dominant: toRgbString(resolvedDominant),
    vibrant: toRgbString(resolvedVibrant),
    darkMuted: toRgbString(darkMuted),
    highlight: toRgbString(resolvedHighlight),
    gradientEnd: toRgbString(resolvedGradientEnd),
  };
}

export function getPaletteLuminance(color: string) {
  return getLuminance(parseRgbString(color));
}

export function getPaletteSaturation(color: string) {
  return getSaturation(parseRgbString(color));
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

async function fetchArtworkObjectUrl(imageUrl: string): Promise<string> {
  const response = await fetch(imageUrl, {
    credentials: 'same-origin',
    mode: 'cors',
  });
  if (!response.ok) throw new Error(`Failed to fetch artwork: ${response.status}`);
  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) throw new Error('Artwork response is not an image');
  return URL.createObjectURL(blob);
}

function shouldRetryPaletteSamplingViaFetch(source: MediaArtworkPaletteSource, imageUrl: string) {
  if (source.authStrategy && source.authStrategy !== 'none') {
    return true;
  }

  if (imageUrl.startsWith('/')) {
    return true;
  }

  try {
    const resolvedUrl = new URL(imageUrl, window.location.href);
    return resolvedUrl.origin === window.location.origin;
  } catch {
    return false;
  }
}

function normalizePaletteSource(
  input: MediaArtworkPaletteSource | string | null | undefined
): MediaArtworkPaletteSource | null {
  if (!input) {
    return null;
  }

  if (typeof input === 'string') {
    return {
      url: input,
      authStrategy: 'none',
    };
  }

  return input.url ? input : null;
}

export async function resolveArtworkPalette(
  input: MediaArtworkPaletteSource | string | null | undefined,
  hassUrl?: string
): Promise<MediaArtworkPalette | null> {
  void hassUrl;
  const source = normalizePaletteSource(input);
  const imageUrl = source?.url;
  if (!imageUrl) {
    return null;
  }

  if (imageUrl.startsWith('data:') || imageUrl.startsWith('blob:')) {
    return samplePaletteFromImageUrl(imageUrl).catch(() => null);
  }

  const directPalette = await samplePaletteFromImageUrl(imageUrl).catch(() => null);
  if (directPalette) return directPalette;

  if (!shouldRetryPaletteSamplingViaFetch(source, imageUrl)) {
    return null;
  }

  const objectUrl = await fetchArtworkObjectUrl(imageUrl).catch(() => null);
  if (!objectUrl) return null;
  try {
    return await samplePaletteFromImageUrl(objectUrl);
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}
