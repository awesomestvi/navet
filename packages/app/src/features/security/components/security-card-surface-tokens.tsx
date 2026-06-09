import { getCardShellSurfaceTokens } from '@navet/app/components/shared/theme/card-shell-surface-tokens';
import { getLightCardSurfaceTokens } from '@navet/app/components/shared/theme/light-card-surface-tokens';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { ThemeColors, ThemeType } from '@navet/app/hooks/use-theme';

export function getSecurityCardSurfaceTokens(theme: ThemeType) {
  const surface = getThemeSurfaceTokens(theme);

  return {
    surface,
    containerShadowClassName: surface.cardShadow,
    overlayClassName: theme === 'glass' ? 'bg-white/[0.03]' : null,
    primaryTextClassName: surface.textPrimary,
    secondaryTextClassName: surface.textSecondary,
    subtleButtonClassName:
      theme === 'light'
        ? 'bg-gray-900/10 text-gray-900 hover:bg-gray-900/20'
        : `${surface.subtleBg} ${surface.hoverBg} text-white`,
    actionButtonClassName:
      theme === 'light'
        ? 'bg-gray-100 text-gray-900 hover:bg-gray-200'
        : theme === 'glass'
          ? 'bg-white/8 text-white hover:bg-white/12'
          : 'bg-zinc-900 text-white hover:bg-zinc-800',
    sliderTrackClassName:
      theme === 'light' ? 'bg-gray-200' : theme === 'glass' ? 'bg-white/12' : 'bg-zinc-800',
    dialogContentClassName:
      theme === 'glass' ? 'bg-white/10 border-white/18' : 'bg-zinc-950 border-zinc-700',
    lockCardOverlay:
      theme === 'light' ? 'bg-white/22' : theme === 'glass' ? 'bg-white/[0.03]' : 'bg-black/10',
    lockStatusText: theme === 'light' ? 'text-red-950' : 'text-white',
    lockStatusSubtext: theme === 'light' ? 'text-red-700' : 'text-red-200',
    lockButtonBg: theme === 'light' ? 'bg-white/65' : 'bg-white/6',
    dialogOptionClassName(themeSelected: boolean) {
      if (themeSelected) {
        return 'bg-indigo-500/20 border-indigo-500 shadow-lg shadow-indigo-500/20';
      }

      return theme === 'glass'
        ? 'bg-white/8 border-white/14 hover:bg-white/12 hover:border-white/22'
        : 'bg-zinc-900 border-zinc-700 hover:bg-zinc-800 hover:border-zinc-600';
    },
    dialogOptionIconWrapClassName(themeSelected: boolean) {
      if (themeSelected) {
        return 'bg-indigo-500/30';
      }

      return theme === 'glass' ? 'bg-white/12' : 'bg-zinc-800';
    },
    dialogOptionIconClassName(themeSelected: boolean) {
      return themeSelected ? 'text-indigo-400' : 'text-gray-300';
    },
    dialogOptionTextClassName(themeSelected: boolean) {
      return themeSelected ? 'text-white' : 'text-gray-300';
    },
    dialogCancelButtonClassName:
      theme === 'glass' ? 'bg-white/8 hover:bg-white/12' : 'bg-zinc-900 hover:bg-zinc-800',
  };
}

export function getSecurityStateSurfaceProps(
  tone: 'neutral' | 'warning' | 'danger' | 'accent' | 'armed' | 'success',
  theme: ThemeType,
  colors: ThemeColors,
  accentColor: string
) {
  const cardShell = getCardShellSurfaceTokens(theme);
  const securitySurface = getSecurityCardSurfaceTokens(theme);
  const surface = getThemeSurfaceTokens(theme);

  if (tone === 'success') {
    const lockColors = colors.lock.locked;

    return {
      frameClassName: `${cardShell.rootFrameClassName} bg-linear-to-br ${lockColors.gradient} ${lockColors.border} ${securitySurface.containerShadowClassName}`,
      overlay: (
        <>
          <div
            className={`absolute inset-0 bg-linear-to-b ${lockColors.glow} via-transparent to-transparent`}
          />
          <div className={`absolute inset-0 ${securitySurface.lockCardOverlay}`} />
        </>
      ),
      disableDefaultSheen: true,
    };
  }

  if (tone === 'accent') {
    const accentSurface = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: null,
      currentColor: '#38bdf8',
      theme,
      lightColors: colors.light,
      accentColor,
    });

    return {
      frameClassName: `${cardShell.rootFrameClassName} ${accentSurface.cardClassName}`,
      frameStyle: accentSurface.cardStyle,
      overlay: (
        <>
          {accentSurface.activeGlowClassName ? (
            <div
              className={accentSurface.activeGlowClassName}
              style={accentSurface.activeGlowStyle}
            />
          ) : null}
          {accentSurface.innerOverlayClassName ? (
            <div
              className={accentSurface.innerOverlayClassName}
              style={accentSurface.innerOverlayStyle}
            />
          ) : null}
          {accentSurface.shineOverlayClassName ? (
            <div className={accentSurface.shineOverlayClassName} />
          ) : null}
        </>
      ),
      disableDefaultSheen: true,
    };
  }

  if (tone === 'armed') {
    const armedSurface = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: null,
      currentColor: null,
      theme,
      lightColors: colors.light,
      accentColor,
    });

    return {
      frameClassName: `${cardShell.rootFrameClassName} ${armedSurface.cardClassName}`,
      frameStyle: armedSurface.cardStyle,
      overlay: (
        <>
          {armedSurface.activeGlowClassName ? (
            <div
              className={armedSurface.activeGlowClassName}
              style={armedSurface.activeGlowStyle}
            />
          ) : null}
          {armedSurface.innerOverlayClassName ? (
            <div
              className={armedSurface.innerOverlayClassName}
              style={armedSurface.innerOverlayStyle}
            />
          ) : null}
          {armedSurface.shineOverlayClassName ? (
            <div className={armedSurface.shineOverlayClassName} />
          ) : null}
        </>
      ),
      disableDefaultSheen: true,
    };
  }

  if (tone === 'warning') {
    const warningSurface =
      theme === 'light'
        ? {
            gradient: 'from-amber-100/90 to-yellow-100/80',
            border: 'border-amber-300/60',
            glow: 'from-amber-300/28',
          }
        : theme === 'glass'
          ? {
              gradient: 'from-amber-800/80 to-yellow-900/86',
              border: 'border-amber-500/24',
              glow: 'from-amber-300/18',
            }
          : theme === 'black'
            ? {
                gradient: 'from-amber-950/92 to-yellow-950/95',
                border: 'border-amber-700/24',
                glow: 'from-amber-500/12',
              }
            : {
                gradient: 'from-amber-950/90 to-yellow-950/92',
                border: 'border-amber-700/24',
                glow: 'from-amber-400/14',
              };

    return {
      frameClassName: `${cardShell.rootFrameClassName} bg-linear-to-br ${warningSurface.gradient} ${warningSurface.border} ${securitySurface.containerShadowClassName}`,
      overlay: (
        <>
          <div
            className={`absolute inset-0 bg-linear-to-b ${warningSurface.glow} via-transparent to-transparent`}
          />
          <div className={`absolute inset-0 ${securitySurface.lockCardOverlay}`} />
        </>
      ),
      disableDefaultSheen: true,
    };
  }

  if (tone === 'neutral') {
    return {
      frameClassName: `${cardShell.rootFrameClassName} ${securitySurface.containerShadowClassName}`,
      frameStyle: undefined,
      overlay:
        theme === 'glass' ? <div className={`absolute inset-0 ${surface.panel}`} /> : undefined,
      disableDefaultSheen: false,
    };
  }

  const lockColors = colors.lock.unlocked;

  return {
    frameClassName: `${cardShell.rootFrameClassName} bg-linear-to-br ${lockColors.gradient} ${lockColors.border} ${securitySurface.containerShadowClassName}`,
    overlay: (
      <>
        <div
          className={`absolute inset-0 bg-linear-to-b ${lockColors.glow} via-transparent to-transparent`}
        />
        <div className={`absolute inset-0 ${securitySurface.lockCardOverlay}`} />
      </>
    ),
    disableDefaultSheen: true,
  };
}
