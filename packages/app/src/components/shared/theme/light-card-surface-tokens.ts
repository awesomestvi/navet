import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { withTintAlpha } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import type { ThemeType } from '@navet/app/hooks/use-theme';
import { darkenColor, getGradientColors } from '@navet/app/utils/color-utils';
import type { CSSProperties } from 'react';

interface LightColors {
  gradient: string;
  border: string;
  iconBg: string;
  glow: string;
  accent?: string;
}

interface LightCardSurfaceTokensParams {
  isOn: boolean;
  isColorMode?: boolean;
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
  isColorMode = false,
  selectedColor,
  customColor,
  currentColor,
  theme,
  lightColors,
  accentColor,
}: LightCardSurfaceTokensParams): LightCardSurfaceTokens {
  const isHexColor = (value: string | null | undefined): value is string =>
    typeof value === 'string' && /^#[0-9a-fA-F]{6}$/.test(value);
  const effectiveSelectedColor = isOn
    ? (selectedColor ??
      (isColorMode && isHexColor(customColor) ? customColor : null) ??
      (isHexColor(currentColor) ? currentColor : null) ??
      null)
    : null;
  const gradientColors = getGradientColors(isOn, effectiveSelectedColor, theme);
  const stateSurface = getCardStateSurfaceTokens(theme, isOn);
  const selectedColorBorder =
    theme === 'black'
      ? `${effectiveSelectedColor}33`
      : theme === 'dark'
        ? `${effectiveSelectedColor}4d`
        : theme === 'glass'
          ? `${effectiveSelectedColor}33`
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
    const lightActiveCardStyle = isOn
      ? {
          background: activeBaseColor,
          borderColor: effectiveSelectedColor ? selectedColorBorder : activeBaseColor,
        }
      : undefined;

    return {
      cardClassName: baseCardClassName,
      cardStyle: lightActiveCardStyle,
      contentAccentColor,
      glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
      activeGlowClassName: null,
      activeGlowStyle: undefined,
      innerOverlayClassName: isOn ? null : 'absolute inset-0',
      innerOverlayStyle: isOn ? undefined : { background: 'rgba(255, 255, 255, 0.6)' },
      shineOverlayClassName: null,
      stateSurface,
    };
  }

  if (theme === 'glass') {
    const glassSelectedColorStyle = effectiveSelectedColor
      ? {
          background: `linear-gradient(135deg, ${effectiveSelectedColor} 0%, ${darkenColor(effectiveSelectedColor, 92)} 100%)`,
          borderColor: selectedColorBorder,
        }
      : undefined;

    return {
      cardClassName: baseCardClassName,
      cardStyle: glassSelectedColorStyle
        ? glassSelectedColorStyle
        : !useAccentGradient && gradientColors.customGradient
          ? {
              background: gradientColors.customGradient,
              borderColor: effectiveSelectedColor ? selectedColorBorder : undefined,
            }
          : undefined,
      contentAccentColor,
      glowColor: useAccentGradient ? (accentColor ?? gradientColors.glow) : gradientColors.glow,
      activeGlowClassName: null,
      activeGlowStyle: undefined,
      innerOverlayClassName:
        effectiveSelectedColor || !stateSurface.overlayClassName
          ? null
          : `absolute inset-0 ${stateSurface.overlayClassName}`,
      shineOverlayClassName: null,
      stateSurface,
    };
  }

  if (theme === 'black' && isOn) {
    const blackCardStyle = effectiveSelectedColor
      ? {
          background: `linear-gradient(155deg, ${withTintAlpha(
            activeBaseColor,
            0.18
          )} 0%, ${withTintAlpha(
            activeBaseColor,
            0.3
          )} 100%), linear-gradient(180deg, ${darkenColor(activeBaseColor, 150)}, ${darkenColor(
            activeBaseColor,
            175
          )})`,
          backgroundColor: darkenColor(activeBaseColor, 175),
          borderColor: withTintAlpha(activeBaseColor, 0.28),
        }
      : undefined;

    return {
      cardClassName: baseCardClassName,
      cardStyle: blackCardStyle,
      contentAccentColor,
      glowColor: useAccentGradient ? activeBaseColor : gradientColors.glow || activeBaseColor,
      activeGlowClassName: null,
      activeGlowStyle: undefined,
      innerOverlayClassName: 'absolute inset-0',
      innerOverlayStyle: {
        background:
          'linear-gradient(180deg, rgba(255,255,255,0.012) 0%, rgba(255,255,255,0.004) 16%, rgba(0,0,0,0.1) 100%)',
      },
      shineOverlayClassName: null,
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
