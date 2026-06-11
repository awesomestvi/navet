import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { CSSProperties } from 'react';
import type { MediaArtworkPalette } from './use-media-artwork-colors';

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function parseRgbChannels(color: string) {
  const hexMatch = color.trim().match(/^#([0-9a-f]{3}|[0-9a-f]{6})$/i);
  if (hexMatch) {
    const normalized =
      hexMatch[1].length === 3
        ? hexMatch[1]
            .split('')
            .map((channel) => `${channel}${channel}`)
            .join('')
        : hexMatch[1];

    return {
      r: Number.parseInt(normalized.slice(0, 2), 16),
      g: Number.parseInt(normalized.slice(2, 4), 16),
      b: Number.parseInt(normalized.slice(4, 6), 16),
    };
  }

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

function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getLuminance(foreground);
  const backgroundLuminance = getLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function findReadableDarkColor(
  backgroundColor: string,
  candidates: string[],
  targetContrast: number
) {
  for (const candidate of candidates) {
    if (getContrastRatio(candidate, backgroundColor) >= targetContrast) {
      return candidate;
    }
  }

  return candidates[candidates.length - 1] ?? '#111827';
}

function getArtworkSurfaceLuminance(palette: MediaArtworkPalette) {
  return (
    getLuminance(palette.highlight) * 0.12 +
    getLuminance(palette.dominant) * 0.46 +
    getLuminance(palette.gradientEnd) * 0.42
  );
}

function getForegroundReferenceBackground(palette: MediaArtworkPalette) {
  return getLuminance(palette.dominant) >= getLuminance(palette.gradientEnd)
    ? palette.dominant
    : palette.gradientEnd;
}

function shouldPreferDarkForeground({
  currentColor,
  currentContrastTarget,
  darkCandidateColor,
  darkContrastTarget,
  backgroundColor,
  surfaceLuminance,
}: {
  currentColor: string;
  currentContrastTarget: number;
  darkCandidateColor: string;
  darkContrastTarget: number;
  backgroundColor: string;
  surfaceLuminance: number;
}) {
  const currentContrast = getContrastRatio(currentColor, backgroundColor);
  const darkContrast = getContrastRatio(darkCandidateColor, backgroundColor);
  const currentFails = currentContrast < currentContrastTarget;
  const darkPasses = darkContrast >= darkContrastTarget;

  if (currentFails) {
    return darkPasses && darkContrast > currentContrast;
  }

  return surfaceLuminance > 0.46 && darkPasses && darkContrast > currentContrast + 1.2;
}

export function getMediaReadableForeground({
  theme: _theme,
  palette,
  titleColor,
  subtitleColor,
  hasArtwork = true,
  backgroundColorOverride,
}: {
  theme: ThemeType;
  palette: MediaArtworkPalette;
  titleColor: string;
  subtitleColor: string;
  hasArtwork?: boolean;
  backgroundColorOverride?: string;
}) {
  if (!hasArtwork) {
    return {
      titleColor,
      subtitleColor,
      titleStyle: { color: titleColor } satisfies CSSProperties,
      subtitleStyle: { color: subtitleColor } satisfies CSSProperties,
    };
  }

  const surfaceLuminance = getArtworkSurfaceLuminance(palette);
  const backgroundColor = backgroundColorOverride ?? getForegroundReferenceBackground(palette);
  const darkTitleColor = findReadableDarkColor(
    backgroundColor,
    ['#1f2937', '#111827', '#0f172a'],
    7
  );
  const darkSubtitleColor = findReadableDarkColor(
    backgroundColor,
    ['#334155', '#1f2937', '#0f172a'],
    5.2
  );
  const titleNeedsDarkerForeground = shouldPreferDarkForeground({
    currentColor: titleColor,
    currentContrastTarget: 4.5,
    darkCandidateColor: darkTitleColor,
    darkContrastTarget: 7,
    backgroundColor,
    surfaceLuminance,
  });
  const subtitleNeedsDarkerForeground = shouldPreferDarkForeground({
    currentColor: subtitleColor,
    currentContrastTarget: 4.5,
    darkCandidateColor: darkSubtitleColor,
    darkContrastTarget: 5.2,
    backgroundColor,
    surfaceLuminance,
  });
  const resolvedTitleColor = titleNeedsDarkerForeground ? darkTitleColor : titleColor;
  const resolvedSubtitleColor = subtitleNeedsDarkerForeground ? darkSubtitleColor : subtitleColor;
  const textShadow = 'none';

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
