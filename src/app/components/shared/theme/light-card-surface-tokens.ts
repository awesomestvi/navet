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
  customColor?: string | null;
  currentColor?: string | null;
  theme: ThemeType;
  lightColors?: LightColors;
  accentColor?: string;
}

export interface LightCardSurfaceTokens {
  cardClassName: string;
  cardStyle?: CSSProperties;
  contentAccentColor: string | null;
  glowColor: string;
  activeGlowClassName: string | null;
  activeGlowStyle?: CSSProperties;
  innerOverlayClassName: string | null;
  innerOverlayStyle?: CSSProperties;
  shineOverlayClassName: string | null;
  stateSurface: ReturnType<typeof getCardStateSurfaceTokens>;
}

export function getLightCardSurfaceTokens({
  isOn,
  selectedColor,
  currentColor,
  theme,
  lightColors,
  accentColor,
}: LightCardSurfaceTokensParams): LightCardSurfaceTokens {
  const isHexColor = (value: string | null | undefined): value is string =>
    typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
  const effectiveSelectedColor = isOn
    ? (selectedColor ?? (isHexColor(currentColor) ? currentColor : null) ?? null)
    : null;
  const gradientColors = getGradientColors(isOn, effectiveSelectedColor, theme);
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);
  const selectedColorBorder =
    theme === 'black'
      ? `${effectiveSelectedColor}33`
      : theme === 'dark'
        ? `${effectiveSelectedColor}4d`
        : `${effectiveSelectedColor}66`;
  const activeBaseColor = effectiveSelectedColor ?? accentColor ?? '#f97316';
  const contentAccentColor = isOn ? activeBaseColor : null;
  const useAccentGradient = isOn && !effectiveSelectedColor && lightColors;

  const baseCardClassName = useAccentGradient
    ? `bg-gradient-to-br ${lightColors.gradient} ${lightColors.border} ${stateSurface.containerClassName}`
    : `${gradientColors.border} ${stateSurface.containerClassName} ${
        gradientColors.customGradient
          ? ''
          : `bg-gradient-to-br ${gradientColors.from} ${gradientColors.to}`
      }`.trim();

  if (theme === 'light') {
    const lightOverlayColor = effectiveSelectedColor
      ? `${effectiveSelectedColor}24`
      : `${activeBaseColor}1f`;

    return {
      cardClassName: baseCardClassName,
      cardStyle:
        !useAccentGradient && gradientColors.customGradient
          ? {
              background: gradientColors.customGradient,
              borderColor: effectiveSelectedColor ? selectedColorBorder : undefined,
            }
          : undefined,
      contentAccentColor,
      glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
      activeGlowClassName: null,
      activeGlowStyle: undefined,
      innerOverlayClassName: 'absolute inset-0',
      innerOverlayStyle: isOn
        ? {
            background: `linear-gradient(135deg, ${lightOverlayColor} 0%, rgba(255, 255, 255, 0.16) 100%)`,
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
              borderColor: effectiveSelectedColor ? selectedColorBorder : undefined,
            }
          : undefined,
      contentAccentColor,
      glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
      activeGlowClassName: null,
      activeGlowStyle: undefined,
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
      borderAlphaHex: effectiveSelectedColor ? '33' : '47',
    });
    const blackCardStyle = effectiveSelectedColor
      ? {
          background: gradientColors.customGradient,
          borderColor: selectedColorBorder,
        }
      : blackSurface.cardStyle;

    return {
      cardClassName: baseCardClassName,
      cardStyle: blackCardStyle,
      contentAccentColor,
      glowColor: useAccentGradient ? activeBaseColor : gradientColors.glow || activeBaseColor,
      activeGlowClassName: 'absolute inset-0 transition-all duration-500',
      activeGlowStyle: effectiveSelectedColor
        ? {
            background: `linear-gradient(135deg, ${effectiveSelectedColor}24 0%, transparent 72%)`,
          }
        : undefined,
      innerOverlayClassName: blackSurface.innerOverlayClassName,
      innerOverlayStyle: blackSurface.innerOverlayStyle,
      shineOverlayClassName: blackSurface.shineOverlayClassName,
      stateSurface,
    };
  }

  if (theme === 'dark' && isOn) {
    const darkCardStyle = effectiveSelectedColor
      ? {
          background: `linear-gradient(135deg, ${darkenColor(effectiveSelectedColor, 100)} 0%, ${darkenColor(effectiveSelectedColor, 130)} 100%)`,
          borderColor: selectedColorBorder,
        }
      : undefined;

    return {
      cardClassName: baseCardClassName,
      cardStyle: darkCardStyle,
      contentAccentColor,
      glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
      activeGlowClassName: null,
      activeGlowStyle: undefined,
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
            borderColor: effectiveSelectedColor ? selectedColorBorder : undefined,
          }
        : undefined,
    contentAccentColor,
    glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
    activeGlowClassName: null,
    activeGlowStyle: undefined,
    innerOverlayClassName: stateSurface.overlayClassName
      ? `absolute inset-0 ${stateSurface.overlayClassName}`
      : null,
    shineOverlayClassName: null,
    stateSurface,
  };
}
