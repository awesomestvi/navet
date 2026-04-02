import type { ThemeType } from '@/app/hooks/use-theme';

export type CardTextTone =
  | 'neutral'
  | 'primary'
  | 'orange'
  | 'amber'
  | 'yellow'
  | 'green'
  | 'emerald'
  | 'teal'
  | 'cyan'
  | 'blue'
  | 'indigo'
  | 'purple'
  | 'pink'
  | 'red';

const FAMILY_BASE_COLORS: Record<Exclude<CardTextTone, 'primary' | 'neutral'>, string> = {
  orange: '#f97316',
  amber: '#f59e0b',
  yellow: '#eab308',
  green: '#22c55e',
  emerald: '#10b981',
  teal: '#14b8a6',
  cyan: '#06b6d4',
  blue: '#3b82f6',
  indigo: '#6366f1',
  purple: '#a855f7',
  pink: '#ec4899',
  red: '#ef4444',
};

const NEUTRAL_BACKGROUNDS: Record<ThemeType, string> = {
  light: '#f3f4f6',
  dark: '#18181b',
  glass: '#334155',
  black: '#000000',
};

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

function normalizeHex(color: string): string {
  const value = color.trim().toLowerCase();
  if (/^#[0-9a-f]{6}$/.test(value)) {
    return value;
  }

  if (/^#[0-9a-f]{3}$/.test(value)) {
    return `#${value[1]}${value[1]}${value[2]}${value[2]}${value[3]}${value[3]}`;
  }

  return '#64748b';
}

function hexToRgb(color: string) {
  const normalized = normalizeHex(color);
  return {
    r: Number.parseInt(normalized.slice(1, 3), 16),
    g: Number.parseInt(normalized.slice(3, 5), 16),
    b: Number.parseInt(normalized.slice(5, 7), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b]
    .map((channel) => clamp(Math.round(channel), 0, 255).toString(16).padStart(2, '0'))
    .join('')}`;
}

function mixColors(colorA: string, colorB: string, ratio: number) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);

  return rgbToHex({
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  });
}

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getLuminance(color: string) {
  const { r, g, b } = hexToRgb(color);
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

export function resolveCardToneBaseColor({
  tone,
  accentColor,
  baseColor,
}: {
  tone: CardTextTone;
  accentColor?: string | null;
  baseColor?: string | null;
}) {
  if (baseColor) {
    return normalizeHex(baseColor);
  }

  if (tone === 'primary') {
    return normalizeHex(accentColor ?? '#f97316');
  }

  if (tone === 'neutral') {
    return '#64748b';
  }

  return FAMILY_BASE_COLORS[tone];
}

function resolveBackgroundColor(
  theme: ThemeType,
  tone: CardTextTone,
  baseColor: string,
  backgroundColor?: string | null
) {
  if (backgroundColor) {
    return normalizeHex(backgroundColor);
  }

  if (tone === 'neutral') {
    return NEUTRAL_BACKGROUNDS[theme];
  }

  if (theme === 'light') {
    return mixColors(baseColor, '#ffffff', 0.84);
  }

  if (theme === 'glass') {
    return mixColors(baseColor, '#334155', 0.78);
  }

  if (theme === 'black') {
    return mixColors(baseColor, '#000000', 0.9);
  }

  return mixColors(baseColor, '#000000', 0.78);
}

function findAccessibleColor(
  baseColor: string,
  backgroundColor: string,
  targetColor: string,
  minBlend: number,
  targetContrast: number
) {
  for (let step = 0; step <= 20; step += 1) {
    const blend = minBlend + ((1 - minBlend) * step) / 20;
    const candidate = mixColors(baseColor, targetColor, blend);
    if (getContrastRatio(candidate, backgroundColor) >= targetContrast) {
      return candidate;
    }
  }

  return targetColor;
}

export function getCardReadableTextTokens({
  theme,
  tone = 'neutral',
  accentColor,
  baseColor,
  backgroundColor,
}: {
  theme: ThemeType;
  tone?: CardTextTone;
  accentColor?: string | null;
  baseColor?: string | null;
  backgroundColor?: string | null;
}) {
  const resolvedBaseColor = resolveCardToneBaseColor({ tone, accentColor, baseColor });
  const resolvedBackgroundColor = resolveBackgroundColor(
    theme,
    tone,
    resolvedBaseColor,
    backgroundColor
  );
  const contrastBackgroundColor =
    theme === 'glass'
      ? mixColors(resolvedBackgroundColor, '#64748b', 0.24)
      : resolvedBackgroundColor;
  const backgroundIsDark = getLuminance(contrastBackgroundColor) < 0.32;
  const targetEndpoint = theme === 'glass' || backgroundIsDark ? '#ffffff' : '#111827';
  const titleMinBlend = theme === 'glass' ? 0.78 : backgroundIsDark ? 0.36 : 0.52;
  const subtitleMinBlend = theme === 'glass' ? 0.86 : backgroundIsDark ? 0.28 : 0.6;
  const titleContrastTarget = theme === 'glass' ? 6 : 4.5;
  const subtitleContrastTarget = theme === 'glass' ? 5.2 : 4.5;

  return {
    titleColor: findAccessibleColor(
      resolvedBaseColor,
      contrastBackgroundColor,
      targetEndpoint,
      titleMinBlend,
      titleContrastTarget
    ),
    subtitleColor: findAccessibleColor(
      resolvedBaseColor,
      contrastBackgroundColor,
      targetEndpoint,
      subtitleMinBlend,
      subtitleContrastTarget
    ),
  };
}
