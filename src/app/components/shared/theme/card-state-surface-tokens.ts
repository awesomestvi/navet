import type { CSSProperties } from 'react';
import type { ThemeType } from '@/app/hooks/use-theme';
import { getBlackActiveCardSurfaceTokens } from './black-active-card-surface';
import { getThemeSurfaceTokens } from './theme-surface-tokens';

export interface CardStateSurfaceTokens {
  containerClassName: string;
  overlayClassName: string | null;
  primaryTextClassName: string;
  secondaryTextClassName: string;
  mutedTextClassName: string;
  artworkClassName: string;
}

export interface CardStateSurfaceStyleTokens {
  cardStyle?: CSSProperties;
  innerOverlayClassName: string | null;
  innerOverlayStyle?: CSSProperties;
  shineOverlayClassName: string | null;
}

export function getCardStateSurfaceTokens(
  theme: ThemeType,
  isActive: boolean
): CardStateSurfaceTokens {
  const surface = getThemeSurfaceTokens(theme);

  if (theme === 'light') {
    return {
      containerClassName: isActive ? '' : 'brightness-[0.985]',
      overlayClassName: null,
      primaryTextClassName: isActive ? surface.textPrimary : 'text-slate-800',
      secondaryTextClassName: isActive ? surface.textSecondary : 'text-slate-600',
      mutedTextClassName: isActive ? surface.textMuted : 'text-slate-500',
      artworkClassName: isActive ? '' : 'brightness-[0.94] saturate-[0.82]',
    };
  }

  if (isActive) {
    return {
      containerClassName: '',
      overlayClassName: null,
      primaryTextClassName: 'card-primary-text',
      secondaryTextClassName: surface.textSecondary,
      mutedTextClassName: 'card-muted-text',
      artworkClassName: '',
    };
  }

  if (theme === 'glass') {
    return {
      containerClassName: 'saturate-[0.82]',
      overlayClassName: 'bg-slate-950/14',
      primaryTextClassName: 'card-primary-text',
      secondaryTextClassName: 'text-white/66',
      mutedTextClassName: 'card-muted-text',
      artworkClassName: 'opacity-68 saturate-[0.74]',
    };
  }

  if (theme === 'black') {
    return {
      containerClassName: '',
      overlayClassName: null,
      primaryTextClassName: 'card-primary-text',
      secondaryTextClassName: 'text-gray-300',
      mutedTextClassName: 'card-muted-text',
      artworkClassName: 'brightness-[0.88] saturate-[0.72]',
    };
  }

  // dark (default)
  return {
    containerClassName: '',
    overlayClassName: null,
    primaryTextClassName: 'card-primary-text',
    secondaryTextClassName: 'text-gray-300',
    mutedTextClassName: 'card-muted-text',
    artworkClassName: 'brightness-[0.88] saturate-[0.72]',
  };
}

export function getCardStateSurfaceStyleTokens({
  theme,
  isActive,
  baseColor,
  borderAlphaHex,
  tintMidAlphaHex,
  tintEndAlphaHex,
  radialAlphaHex,
}: {
  theme: ThemeType;
  isActive: boolean;
  baseColor?: string | null;
  borderAlphaHex?: string;
  tintMidAlphaHex?: string;
  tintEndAlphaHex?: string;
  radialAlphaHex?: string;
}): CardStateSurfaceStyleTokens {
  if (!isActive || theme !== 'black' || !baseColor) {
    return {
      innerOverlayClassName: null,
      shineOverlayClassName: null,
    };
  }

  const blackSurface = getBlackActiveCardSurfaceTokens(baseColor, {
    borderAlphaHex,
    tintMidAlphaHex,
    tintEndAlphaHex,
    radialAlphaHex,
  });

  return {
    cardStyle: blackSurface.cardStyle,
    innerOverlayClassName: 'absolute inset-0',
    innerOverlayStyle: blackSurface.innerOverlayStyle,
    shineOverlayClassName: blackSurface.shineOverlayClassName,
  };
}
