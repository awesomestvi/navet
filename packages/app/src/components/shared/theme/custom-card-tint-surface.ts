import { getCardReadableTextTokens } from '@navet/app/components/shared/theme/card-readable-text-tokens';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { darkenColor, darkenColorPreserveHue } from '@navet/app/utils/color-utils';
import type { CSSProperties } from 'react';

function isValidHexColor(value: string | null | undefined): value is string {
  return typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
}

function hexToRgb(color: string) {
  const hex = color.replace('#', '');
  return {
    r: Number.parseInt(hex.slice(0, 2), 16),
    g: Number.parseInt(hex.slice(2, 4), 16),
    b: Number.parseInt(hex.slice(4, 6), 16),
  };
}

function rgbToHex({ r, g, b }: { r: number; g: number; b: number }) {
  return `#${[r, g, b]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, '0')
    )
    .join('')}`;
}

function mixHexColors(colorA: string, colorB: string, ratio: number) {
  const a = hexToRgb(colorA);
  const b = hexToRgb(colorB);

  return rgbToHex({
    r: a.r + (b.r - a.r) * ratio,
    g: a.g + (b.g - a.g) * ratio,
    b: a.b + (b.b - a.b) * ratio,
  });
}

export function withTintAlpha(color: string, alpha: number) {
  const { r, g, b } = hexToRgb(color);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export function normalizeCustomCardTint(tintColor: unknown): string | undefined {
  const normalizedTint = typeof tintColor === 'string' ? tintColor : undefined;
  return isValidHexColor(normalizedTint) ? normalizedTint : undefined;
}

export function getCustomCardTintSurface(
  theme: ThemeType,
  tintColor?: string
): {
  panelStyle?: CSSProperties;
  glowStyle?: CSSProperties;
  overlayClassName?: string | null;
  subtleFill?: string;
  backgroundColor?: string;
  textPrimaryColor?: string;
  textSecondaryColor?: string;
} {
  const normalizedTint = normalizeCustomCardTint(tintColor);
  if (!normalizedTint) {
    return {};
  }

  const buildReadableText = (backgroundColor: string) =>
    getCardReadableTextTokens({
      theme,
      tone: 'neutral',
      backgroundColor,
    });

  if (theme === 'light') {
    const backgroundColor = mixHexColors(normalizedTint, '#ffffff', 0.86);
    const readableText = buildReadableText(backgroundColor);

    return {
      panelStyle: {
        background: `linear-gradient(135deg, rgba(255,255,255,0.98) 0%, ${withTintAlpha(
          normalizedTint,
          0.14
        )} 100%)`,
        borderColor: withTintAlpha(normalizedTint, 0.24),
        boxShadow: `0 18px 40px -28px ${withTintAlpha(normalizedTint, 0.28)}`,
      },
      glowStyle: {
        background: `radial-gradient(circle at 14% 12%, ${withTintAlpha(
          normalizedTint,
          0.18
        )} 0%, transparent 34%), linear-gradient(155deg, ${withTintAlpha(
          normalizedTint,
          0.1
        )} 0%, transparent 60%)`,
      },
      overlayClassName: null,
      subtleFill: withTintAlpha(normalizedTint, 0.12),
      backgroundColor,
      textPrimaryColor: readableText.titleColor,
      textSecondaryColor: readableText.subtitleColor,
    };
  }

  if (theme === 'glass') {
    const backgroundColor = darkenColor(normalizedTint, 92);
    const readableText = buildReadableText(backgroundColor);

    return {
      panelStyle: {
        background: `linear-gradient(145deg, rgba(255,255,255,0.16) 0%, ${withTintAlpha(
          normalizedTint,
          0.16
        )} 46%, rgba(255,255,255,0.04) 100%)`,
        borderColor: withTintAlpha(normalizedTint, 0.24),
        boxShadow: `0 24px 60px -38px ${withTintAlpha(normalizedTint, 0.42)}`,
      },
      glowStyle: {
        background: `radial-gradient(circle at 14% 12%, ${withTintAlpha(
          normalizedTint,
          0.22
        )} 0%, transparent 30%), radial-gradient(circle at 82% 18%, ${withTintAlpha(
          normalizedTint,
          0.14
        )} 0%, transparent 26%), linear-gradient(155deg, ${withTintAlpha(
          normalizedTint,
          0.1
        )} 0%, transparent 58%)`,
      },
      overlayClassName: 'bg-white/[0.03]',
      subtleFill: withTintAlpha(normalizedTint, 0.16),
      backgroundColor,
      textPrimaryColor: readableText.titleColor,
      textSecondaryColor: readableText.subtitleColor,
    };
  }

  if (theme === 'black') {
    const backgroundColor = darkenColor(normalizedTint, 175);
    const readableText = buildReadableText(backgroundColor);

    return {
      panelStyle: {
        background: `linear-gradient(155deg, rgba(0,0,0,0.98) 0%, ${withTintAlpha(
          normalizedTint,
          0.24
        )} 100%)`,
        borderColor: withTintAlpha(normalizedTint, 0.26),
        boxShadow: `0 26px 64px -40px ${withTintAlpha(normalizedTint, 0.42)}`,
      },
      glowStyle: {
        background: `radial-gradient(circle at 14% 12%, ${withTintAlpha(
          normalizedTint,
          0.18
        )} 0%, transparent 30%), linear-gradient(155deg, ${withTintAlpha(
          normalizedTint,
          0.08
        )} 0%, transparent 58%)`,
      },
      overlayClassName: null,
      subtleFill: withTintAlpha(normalizedTint, 0.18),
      backgroundColor,
      textPrimaryColor: readableText.titleColor,
      textSecondaryColor: readableText.subtitleColor,
    };
  }

  const backgroundColor = darkenColorPreserveHue(normalizedTint, 116);
  const readableText = buildReadableText(backgroundColor);

  return {
    panelStyle: {
      background: `linear-gradient(135deg, ${darkenColorPreserveHue(normalizedTint, 100)} 0%, ${darkenColorPreserveHue(
        normalizedTint,
        130
      )} 100%)`,
      borderColor: withTintAlpha(normalizedTint, 0.3),
      boxShadow: `0 26px 62px -38px ${withTintAlpha(normalizedTint, 0.28)}, inset 0 1px 0 rgba(255,255,255,0.04)`,
    },
    glowStyle: {
      background: `radial-gradient(circle at 14% 12%, ${withTintAlpha(
        normalizedTint,
        0.16
      )} 0%, transparent 30%), radial-gradient(circle at 82% 18%, ${withTintAlpha(
        normalizedTint,
        0.1
      )} 0%, transparent 24%), linear-gradient(155deg, ${withTintAlpha(
        normalizedTint,
        0.06
      )} 0%, transparent 56%)`,
    },
    overlayClassName: null,
    subtleFill: withTintAlpha(normalizedTint, 0.14),
    backgroundColor,
    textPrimaryColor: readableText.titleColor,
    textSecondaryColor: readableText.subtitleColor,
  };
}

export function getInheritedDialogSectionStyle(
  theme: ThemeType,
  tintColor?: string,
  fallbackColor?: string
): CSSProperties | undefined {
  const sectionColor = normalizeCustomCardTint(tintColor) ?? normalizeCustomCardTint(fallbackColor);

  if (!sectionColor) {
    return undefined;
  }

  return {
    backgroundColor: withTintAlpha(sectionColor, theme === 'light' ? 0.08 : 0.14),
    borderColor: withTintAlpha(sectionColor, theme === 'light' ? 0.16 : 0.24),
  };
}
