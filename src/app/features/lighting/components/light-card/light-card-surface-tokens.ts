import type { CSSProperties } from 'react';
import {
  getCardStateSurfaceStyleTokens,
  getCardStateSurfaceTokens,
} from '@/app/components/shared/theme/card-state-surface-tokens';
import type { ThemeType } from '@/app/hooks/use-theme';
import { darkenColor, getGradientColors } from '@/app/utils/color-utils';

interface LightColors {
  gradient: string;
  border: string;
  iconBg: string;
  glow: string;
  accent?: string;
}

interface LightCardSurfaceTokensParams {
  isOn: boolean;
  selectedColor: string | null;
  theme: ThemeType;
  lightColors?: LightColors;
  accentColor?: string;
}

export interface LightCardSurfaceTokens {
  cardClassName: string;
  cardStyle?: CSSProperties;
  glowColor: string;
  activeGlowClassName: string | null;
  innerOverlayClassName: string | null;
  innerOverlayStyle?: CSSProperties;
  shineOverlayClassName: string | null;
  stateSurface: ReturnType<typeof getCardStateSurfaceTokens>;
}

export function getLightCardSurfaceTokens({
  isOn,
  selectedColor,
  theme,
  lightColors,
  accentColor,
}: LightCardSurfaceTokensParams): LightCardSurfaceTokens {
  const gradientColors = getGradientColors(isOn, selectedColor, theme);
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);
  const selectedColorBorder =
    theme === 'black'
      ? `${selectedColor}33`
      : theme === 'dark'
        ? `${selectedColor}4d`
        : `${selectedColor}66`;
  const activeBaseColor = selectedColor ?? accentColor ?? '#f97316';

  // When on with no color selected, use the theme-aware lightColors gradient (same source as switch cards)
  const useAccentGradient = isOn && !selectedColor && lightColors;

  const baseCardClassName = useAccentGradient
    ? `bg-gradient-to-br ${lightColors.gradient} ${lightColors.border} ${stateSurface.containerClassName}`
    : `${gradientColors.border} ${stateSurface.containerClassName} ${
        gradientColors.customGradient
          ? ''
          : `bg-gradient-to-br ${gradientColors.from} ${gradientColors.to}`
      }`.trim();

  if (theme === 'light') {
    return {
      cardClassName: baseCardClassName,
      cardStyle:
        !useAccentGradient && gradientColors.customGradient
          ? {
              background: gradientColors.customGradient,
              borderColor: selectedColor ? selectedColorBorder : undefined,
            }
          : undefined,
      glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
      activeGlowClassName: null,
      innerOverlayClassName: 'absolute inset-0',
      innerOverlayStyle: isOn
        ? {
            background: selectedColor
              ? `linear-gradient(135deg, ${selectedColor}24 0%, rgba(255, 255, 255, 0.16) 100%)`
              : 'rgba(255, 247, 220, 0.18)',
          }
        : { background: 'rgba(255, 255, 255, 0.6)' },
      shineOverlayClassName: null,
      stateSurface,
    };
  }

  if (theme === 'glass') {
    return {
      cardClassName: baseCardClassName,
      cardStyle:
        !useAccentGradient && gradientColors.customGradient
          ? {
              background: gradientColors.customGradient,
              borderColor: selectedColor ? selectedColorBorder : undefined,
            }
          : undefined,
      glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
      activeGlowClassName: null,
      innerOverlayClassName: stateSurface.overlayClassName
        ? `absolute inset-0 ${stateSurface.overlayClassName}`
        : null,
      shineOverlayClassName:
        'absolute inset-0 bg-[linear-gradient(180deg,rgba(255,255,255,0.08),rgba(255,255,255,0.015)_38%,transparent_68%)]',
      stateSurface,
    };
  }

  if (theme === 'black' && isOn) {
    const blackSurface = getCardStateSurfaceStyleTokens({
      theme,
      isActive: true,
      baseColor: activeBaseColor,
      borderAlphaHex: selectedColor ? '33' : '47',
    });

    return {
      cardClassName: baseCardClassName,
      cardStyle: blackSurface.cardStyle,
      glowColor: useAccentGradient ? activeBaseColor : gradientColors.glow || activeBaseColor,
      activeGlowClassName: `absolute inset-0 bg-gradient-to-br ${lightColors?.glow || 'from-orange-400/18'} to-transparent transition-all duration-500`,
      innerOverlayClassName: blackSurface.innerOverlayClassName,
      innerOverlayStyle: blackSurface.innerOverlayStyle,
      shineOverlayClassName: blackSurface.shineOverlayClassName,
      stateSurface,
    };
  }

  if (theme === 'dark' && isOn) {
    const darkCardStyle = selectedColor
      ? {
          background: `linear-gradient(135deg, ${darkenColor(selectedColor, 100)} 0%, ${darkenColor(selectedColor, 130)} 100%)`,
          borderColor: selectedColorBorder,
        }
      : undefined; // useAccentGradient handles the className when no selectedColor

    return {
      cardClassName: baseCardClassName,
      cardStyle: darkCardStyle,
      glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
      activeGlowClassName: null,
      innerOverlayClassName: stateSurface.overlayClassName
        ? `absolute inset-0 ${stateSurface.overlayClassName}`
        : null,
      shineOverlayClassName: null,
      stateSurface,
    };
  }

  return {
    cardClassName: baseCardClassName,
    cardStyle:
      !useAccentGradient && gradientColors.customGradient
        ? {
            background: gradientColors.customGradient,
            borderColor: selectedColor ? selectedColorBorder : undefined,
          }
        : undefined,
    glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
    activeGlowClassName: null,
    innerOverlayClassName: stateSurface.overlayClassName
      ? `absolute inset-0 ${stateSurface.overlayClassName}`
      : null,
    shineOverlayClassName: null,
    stateSurface,
  };
}
