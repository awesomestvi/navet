import type { ThemeType } from '@navet/app/hooks/use-theme';

export interface MediaControlSurfaceTokens {
  iconClassName: string;
  crosshairBg: string;
  buttonBorder: string;
  buttonBg?: string;
  disabledOpacity: number;
}

export function getMediaControlSurfaceTokens(
  theme: ThemeType,
  isActive?: boolean
): MediaControlSurfaceTokens {
  if (theme === 'light') {
    return {
      iconClassName: '!text-slate-800',
      crosshairBg: 'rgba(15,23,42,0.08)',
      buttonBorder: 'rgba(15,23,42,0.12)',
      buttonBg: isActive ? 'rgba(15,23,42,0.08)' : undefined,
      disabledOpacity: 0.4,
    };
  }

  return {
    iconClassName: '!text-white/90',
    crosshairBg: 'rgba(255,255,255,0.06)',
    buttonBorder: 'rgba(255,255,255,0.1)',
    buttonBg: isActive ? 'rgba(255,255,255,0.06)' : undefined,
    disabledOpacity: 0.4,
  };
}

export interface MediaArtworkSurfaceTokens {
  fallbackBg: string;
  artworkBorder: string;
  artworkShadow: string;
}

export function getMediaArtworkSurfaceTokens(theme: ThemeType): MediaArtworkSurfaceTokens {
  if (theme === 'light') {
    return {
      fallbackBg: 'rgba(15,23,42,0.08)',
      artworkBorder: 'rgba(15,23,42,0.12)',
      artworkShadow: '0 20px 36px -24px rgba(15,23,42,0.22)',
    };
  }

  return {
    fallbackBg: 'rgba(255,255,255,0.06)',
    artworkBorder: 'rgba(255,255,255,0.1)',
    artworkShadow: '0 18px 34px -24px rgba(2,8,20,0.72)',
  };
}

export interface MediaVisualizerSurfaceTokens {
  barColor: string;
  barGradient?: string;
}

export function getMediaVisualizerSurfaceTokens(
  theme: ThemeType,
  accentColor?: string
): MediaVisualizerSurfaceTokens {
  const defaultColor = theme === 'light' ? 'rgba(15,23,42,0.6)' : 'rgba(255,255,255,0.6)';

  if (accentColor) {
    return {
      barColor: accentColor,
      barGradient:
        theme === 'light'
          ? `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}cc 100%)`
          : `linear-gradient(180deg, ${accentColor} 0%, ${accentColor}99 100%)`,
    };
  }

  return {
    barColor: defaultColor,
  };
}
