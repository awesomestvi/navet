import { type PrimaryColor, type ThemeMode, useThemeStore } from '@/app/stores/theme-store';

export type PresetPrimaryColor = Exclude<PrimaryColor, 'custom'>;

export interface AccentThemeTone {
  gradient: string;
  border: string;
  iconBg: string;
  accent: string;
  glow: string;
}

export interface AccentDecorativeSurface {
  gradient: string;
  border: string;
  glow: string;
}

export type AccentToneEmphasis = 'soft' | 'solid';

export const themeColorValues: Record<PresetPrimaryColor, string> = {
  orange: '#f97316',
  blue: '#3b82f6',
  green: '#22c55e',
  purple: '#a855f7',
  pink: '#ec4899',
  red: '#ef4444',
  yellow: '#eab308',
  teal: '#14b8a6',
};

const presetEntries = Object.entries(themeColorValues) as Array<[PresetPrimaryColor, string]>;

function normalizeHexColor(color: string | null | undefined): string | null {
  if (!color) {
    return null;
  }

  const trimmed = color.trim();
  const withHash = trimmed.startsWith('#') ? trimmed : `#${trimmed}`;

  if (/^#[0-9a-fA-F]{6}$/.test(withHash)) {
    return withHash.toLowerCase();
  }

  if (/^#[0-9a-fA-F]{3}$/.test(withHash)) {
    const [, r, g, b] = withHash;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }

  return null;
}

function hexToRgb(color: string) {
  return {
    r: Number.parseInt(color.slice(1, 3), 16),
    g: Number.parseInt(color.slice(3, 5), 16),
    b: Number.parseInt(color.slice(5, 7), 16),
  };
}

export function resolvePrimaryColorValue(color: PrimaryColor, customColor?: string | null): string {
  if (color !== 'custom') {
    return themeColorValues[color];
  }

  const resolvedCustomColor =
    normalizeHexColor(customColor) ??
    normalizeHexColor(useThemeStore.getState().customPrimaryColor) ??
    themeColorValues.orange;

  return resolvedCustomColor;
}

export function resolvePrimaryColorToken(
  color: PrimaryColor,
  customColor?: string | null
): PresetPrimaryColor {
  if (color !== 'custom') {
    return color;
  }

  const resolvedCustomColor =
    normalizeHexColor(customColor) ??
    normalizeHexColor(useThemeStore.getState().customPrimaryColor);

  if (!resolvedCustomColor) {
    return 'orange';
  }

  const target = hexToRgb(resolvedCustomColor);
  let bestMatch: PresetPrimaryColor = 'orange';
  let bestDistance = Number.POSITIVE_INFINITY;

  for (const [preset, presetColor] of presetEntries) {
    const candidate = hexToRgb(presetColor);
    const distance =
      (candidate.r - target.r) ** 2 + (candidate.g - target.g) ** 2 + (candidate.b - target.b) ** 2;

    if (distance < bestDistance) {
      bestDistance = distance;
      bestMatch = preset;
    }
  }

  return bestMatch;
}

export function getThemeColorValue(color: PrimaryColor): string {
  return resolvePrimaryColorValue(color);
}

export function sanitizeCustomPrimaryColor(color: string | null | undefined) {
  return normalizeHexColor(color);
}

export function getAccentThemeTone(
  theme: ThemeMode,
  color: PresetPrimaryColor,
  emphasis: AccentToneEmphasis = 'soft'
): AccentThemeTone {
  if (theme === 'dark') {
    return emphasis === 'solid'
      ? {
          gradient: `from-${color}-900 to-${color}-950`,
          border: `border-${color}-700`,
          iconBg: `bg-${color}-500`,
          accent: `text-${color}-400`,
          glow: 'transparent',
        }
      : {
          gradient: `from-${color}-900/90 to-${color}-950/95`,
          border: `border-${color}-700/30`,
          iconBg: `bg-${color}-500/20`,
          accent: `text-${color}-400`,
          glow: `from-${color}-500/10`,
        };
  }

  if (theme === 'light') {
    return emphasis === 'solid'
      ? {
          gradient: `from-${color}-100 to-${color}-200`,
          border: `border-${color}-300`,
          iconBg: `bg-${color}-400`,
          accent: `text-${color}-600`,
          glow: 'transparent',
        }
      : {
          gradient: `from-${color}-100/90 to-${color}-200/80`,
          border: `border-${color}-300/60`,
          iconBg: `bg-${color}-400/40`,
          accent: `text-${color}-600`,
          glow: `from-${color}-300/30`,
        };
  }

  if (theme === 'black') {
    return emphasis === 'solid'
      ? {
          gradient: `from-${color}-950 to-${color}-900`,
          border: `border-${color}-800`,
          iconBg: `bg-${color}-700`,
          accent: `text-${color}-500`,
          glow: 'transparent',
        }
      : {
          gradient: `from-${color}-950/90 to-${color}-900/95`,
          border: `border-${color}-800/30`,
          iconBg: `bg-${color}-700/20`,
          accent: `text-${color}-500`,
          glow: `from-${color}-600/10`,
        };
  }

  return emphasis === 'solid'
    ? {
        gradient: `from-${color}-800/80 to-${color}-900/90`,
        border: `border-${color}-600/25`,
        iconBg: `bg-${color}-400/15`,
        accent: `text-${color}-400`,
        glow: 'transparent',
      }
    : {
        gradient: `from-${color}-800/70 to-${color}-900/85`,
        border: `border-${color}-600/20`,
        iconBg: `bg-${color}-400/12`,
        accent: `text-${color}-400`,
        glow: `from-${color}-400/6`,
      };
}

export function getAccentDecorativeSurface(
  theme: ThemeMode,
  color: PresetPrimaryColor
): AccentDecorativeSurface {
  const tone = getAccentThemeTone(theme, color, 'soft');

  return {
    gradient: tone.gradient,
    border: tone.border,
    glow: tone.glow,
  };
}

export function getAccentDialogSurface(color: PresetPrimaryColor) {
  return {
    from: `from-${color}-900/95`,
    to: `to-${color}-950/95`,
    border: `border-${color}-500/20`,
  };
}
