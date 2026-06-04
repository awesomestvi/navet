import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { CSSProperties } from 'react';
import type { MediaArtworkPalette } from './use-media-artwork-colors';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseRgbChannels(color: string) {
  const match = color.match(/\d+(\.\d+)?/g);
  if (!match || match.length < 3) {
    return { r: 127, g: 127, b: 127 };
  }

  return {
    r: Number.parseFloat(match[0]),
    g: Number.parseFloat(match[1]),
    b: Number.parseFloat(match[2]),
  };
}

function channelToLinear(channel: number) {
  const normalized = clamp(channel / 255, 0, 1);
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getLuminance(color: string) {
  const { r, g, b } = parseRgbChannels(color);
  const rLinear = channelToLinear(r);
  const gLinear = channelToLinear(g);
  const bLinear = channelToLinear(b);

  return 0.2126 * rLinear + 0.7152 * gLinear + 0.0722 * bLinear;
}

function getArtworkSurfaceLuminance(palette: MediaArtworkPalette) {
  return (
    getLuminance(palette.highlight) * 0.46 +
    getLuminance(palette.dominant) * 0.34 +
    getLuminance(palette.gradientEnd) * 0.2
  );
}

export function getMediaReadableForeground({
  theme,
  palette,
  titleColor,
  subtitleColor,
  hasArtwork = true,
}: {
  theme: ThemeType;
  palette: MediaArtworkPalette;
  titleColor: string;
  subtitleColor: string;
  hasArtwork?: boolean;
}) {
  if (theme !== 'glass' || !hasArtwork) {
    return {
      titleColor,
      subtitleColor,
      titleStyle: { color: titleColor } satisfies CSSProperties,
      subtitleStyle: { color: subtitleColor } satisfies CSSProperties,
    };
  }

  const surfaceLuminance = getArtworkSurfaceLuminance(palette);
  const useDarkForeground = surfaceLuminance > 0.5;
  const resolvedTitleColor = useDarkForeground ? '#1f2937' : titleColor;
  const resolvedSubtitleColor = useDarkForeground ? '#475569' : subtitleColor;
  const textShadow = useDarkForeground
    ? '0 1px 0 rgba(255,255,255,0.22), 0 1px 10px rgba(255,255,255,0.12)'
    : '0 1px 10px rgba(0,0,0,0.32)';

  return {
    titleColor: resolvedTitleColor,
    subtitleColor: resolvedSubtitleColor,
    titleStyle: {
      color: resolvedTitleColor,
      textShadow,
    } satisfies CSSProperties,
    subtitleStyle: {
      color: resolvedSubtitleColor,
      textShadow,
    } satisfies CSSProperties,
  };
}
