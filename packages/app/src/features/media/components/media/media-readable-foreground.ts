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

function getSaturation(color: string) {
  const { r, g, b } = parseRgbChannels(color);
  return (Math.max(r, g, b) - Math.min(r, g, b)) / 255;
}

function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getLuminance(foreground);
  const backgroundLuminance = getLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

function toRgbString({ r, g, b }: { r: number; g: number; b: number }) {
  return `rgb(${Math.round(clamp(r, 0, 255))}, ${Math.round(clamp(g, 0, 255))}, ${Math.round(
    clamp(b, 0, 255)
  )})`;
}

function mixColors(colorA: string, colorB: string, ratio: number) {
  const a = parseRgbChannels(colorA);
  const b = parseRgbChannels(colorB);

  return toRgbString({
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  });
}

function darkenColor(color: string, amount: number) {
  const channels = parseRgbChannels(color);

  return toRgbString({
    r: channels.r * (1 - amount),
    g: channels.g * (1 - amount),
    b: channels.b * (1 - amount),
  });
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

function getAccentPriorityScore(color: string, backgroundColor: string) {
  const saturation = getSaturation(color);
  const luminance = getLuminance(color);
  const contrast = getContrastRatio(color, backgroundColor);
  const backgroundLuminance = getLuminance(backgroundColor);

  if (backgroundLuminance < 0.34) {
    return saturation * 2.6 + Math.max(0, luminance - 0.18) * 1.4 + Math.min(contrast, 8) * 0.08;
  }

  return saturation * 2.4 + Math.max(0, 0.58 - luminance) * 1.2 + Math.min(contrast, 8) * 0.08;
}

function getForegroundReferenceBackground(palette: MediaArtworkPalette) {
  return getLuminance(palette.dominant) >= getLuminance(palette.gradientEnd)
    ? palette.dominant
    : palette.gradientEnd;
}

function getArtworkDarkForegroundCandidates(palette: MediaArtworkPalette) {
  const darkAnchor = mixColors(palette.darkMuted, palette.gradientEnd, 0.4);
  const darkAccent = mixColors(palette.darkMuted, palette.dominant, 0.22);
  const mutedDominant = mixColors(palette.dominant, palette.gradientEnd, 0.62);
  const deepAnchor = mixColors(darkenColor(darkAnchor, 0.2), 'rgb(0, 0, 0)', 0.28);
  const deepAccent = mixColors(darkenColor(darkAccent, 0.26), 'rgb(0, 0, 0)', 0.34);

  return {
    title: [
      darkenColor(darkAccent, 0.26),
      deepAnchor,
      deepAccent,
      darkenColor(darkAnchor, 0.2),
      darkenColor(mutedDominant, 0.42),
      '#1f2937',
      '#111827',
      '#0f172a',
    ],
    subtitle: [
      darkenColor(darkAnchor, 0.2),
      darkenColor(darkAccent, 0.26),
      deepAnchor,
      darkenColor(mutedDominant, 0.28),
      deepAccent,
      '#334155',
      '#1f2937',
      '#0f172a',
    ],
  };
}

function getDarkAccentBaseCandidates(palette: MediaArtworkPalette, backgroundColor: string) {
  const ordered = [
    palette.vibrant,
    palette.darkMuted,
    palette.gradientEnd,
    palette.dominant,
    mixColors(palette.vibrant, palette.darkMuted, 0.18),
    mixColors(palette.vibrant, palette.gradientEnd, 0.18),
    mixColors(palette.vibrant, palette.dominant, 0.18),
  ];

  const unique = Array.from(new Set(ordered));

  return unique.sort(
    (left, right) =>
      getAccentPriorityScore(right, backgroundColor) - getAccentPriorityScore(left, backgroundColor)
  );
}

function getArtworkAccentForegroundCandidates(
  palette: MediaArtworkPalette,
  backgroundColor: string
) {
  const accentBaseCandidates = getDarkAccentBaseCandidates(palette, backgroundColor);
  const title: string[] = [];
  const subtitle: string[] = [];
  const backgroundLuminance = getLuminance(backgroundColor);
  const prefersBrightAccent = backgroundLuminance < 0.34;

  for (const accentBase of accentBaseCandidates) {
    const titleAccent = prefersBrightAccent
      ? mixColors(accentBase, 'rgb(255, 255, 255)', 0.16)
      : mixColors(accentBase, 'rgb(0, 0, 0)', 0.12);
    const titleAccentDeep = prefersBrightAccent
      ? mixColors(accentBase, 'rgb(255, 255, 255)', 0.28)
      : mixColors(accentBase, 'rgb(0, 0, 0)', 0.24);
    const subtitleAccent = prefersBrightAccent
      ? mixColors(accentBase, 'rgb(255, 255, 255)', 0.22)
      : mixColors(accentBase, 'rgb(0, 0, 0)', 0.18);
    const subtitleAccentDeep = prefersBrightAccent
      ? mixColors(accentBase, 'rgb(255, 255, 255)', 0.34)
      : mixColors(accentBase, 'rgb(0, 0, 0)', 0.28);
    const groundedAccent = mixColors(accentBase, palette.gradientEnd, 0.08);

    if (prefersBrightAccent) {
      title.push(
        titleAccentDeep,
        titleAccent,
        accentBase,
        mixColors(accentBase, 'rgb(255, 255, 255)', 0.42),
        mixColors(groundedAccent, 'rgb(255, 255, 255)', 0.24)
      );
      subtitle.push(
        subtitleAccentDeep,
        subtitleAccent,
        titleAccentDeep,
        mixColors(accentBase, 'rgb(255, 255, 255)', 0.42),
        mixColors(groundedAccent, 'rgb(255, 255, 255)', 0.3)
      );
    } else {
      title.push(
        accentBase,
        titleAccent,
        titleAccentDeep,
        darkenColor(accentBase, 0.28),
        mixColors(groundedAccent, 'rgb(0, 0, 0)', 0.18),
        mixColors(accentBase, 'rgb(0, 0, 0)', 0.36)
      );
      subtitle.push(
        subtitleAccent,
        subtitleAccentDeep,
        titleAccentDeep,
        mixColors(groundedAccent, 'rgb(0, 0, 0)', 0.24),
        mixColors(accentBase, 'rgb(0, 0, 0)', 0.36)
      );
    }
  }

  return {
    accentBase: accentBaseCandidates[0] ?? palette.vibrant,
    title: Array.from(new Set(title)),
    subtitle: Array.from(new Set(subtitle)),
  };
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

  const backgroundColor = backgroundColorOverride ?? getForegroundReferenceBackground(palette);
  const titleContrastTarget = 4.5;
  const subtitleContrastTarget = 4.5;
  const accentCandidates = getArtworkAccentForegroundCandidates(palette, backgroundColor);
  const darkCandidates = getArtworkDarkForegroundCandidates(palette);
  const accentTitleColor = findReadableDarkColor(
    backgroundColor,
    accentCandidates.title,
    titleContrastTarget
  );
  const accentSubtitleColor = findReadableDarkColor(
    backgroundColor,
    accentCandidates.subtitle,
    subtitleContrastTarget
  );
  const darkTitleColor = findReadableDarkColor(
    backgroundColor,
    darkCandidates.title,
    titleContrastTarget
  );
  const darkSubtitleColor = findReadableDarkColor(
    backgroundColor,
    darkCandidates.subtitle,
    subtitleContrastTarget
  );
  const currentTitleContrast = getContrastRatio(titleColor, backgroundColor);
  const currentSubtitleContrast = getContrastRatio(subtitleColor, backgroundColor);
  const accentTitleContrast = getContrastRatio(accentTitleColor, backgroundColor);
  const accentSubtitleContrast = getContrastRatio(accentSubtitleColor, backgroundColor);
  const darkTitleContrast = getContrastRatio(darkTitleColor, backgroundColor);
  const darkSubtitleContrast = getContrastRatio(darkSubtitleColor, backgroundColor);
  const accentFamilyPasses =
    accentTitleContrast >= titleContrastTarget && accentSubtitleContrast >= subtitleContrastTarget;
  const darkFamilyPasses =
    darkTitleContrast >= titleContrastTarget && darkSubtitleContrast >= subtitleContrastTarget;
  const currentFamilyFails =
    currentTitleContrast < titleContrastTarget || currentSubtitleContrast < subtitleContrastTarget;
  const currentAverageContrast = (currentTitleContrast + currentSubtitleContrast) / 2;
  const darkAverageContrast = (darkTitleContrast + darkSubtitleContrast) / 2;
  const accentBaseSaturation = getSaturation(accentCandidates.accentBase);
  const preferAccentFamily = accentFamilyPasses && accentBaseSaturation >= 0.16;
  const preferDarkFamilyFromSurface =
    !preferAccentFamily && darkAverageContrast > currentAverageContrast + 1.2;
  const useDarkForegroundFamily =
    darkFamilyPasses && (currentFamilyFails || preferDarkFamilyFromSurface);
  const accentOrDarkTitleColor = preferAccentFamily
    ? accentTitleColor
    : useDarkForegroundFamily
      ? darkTitleColor
      : titleColor;
  const accentOrDarkSubtitleColor = preferAccentFamily
    ? accentSubtitleColor
    : useDarkForegroundFamily
      ? darkSubtitleColor
      : subtitleColor;
  const resolvedTitleColor = preferAccentFamily ? accentTitleColor : accentOrDarkTitleColor;
  const resolvedSubtitleColor = preferAccentFamily
    ? accentSubtitleColor
    : accentOrDarkSubtitleColor;
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
