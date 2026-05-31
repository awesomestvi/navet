import type { ThemeType } from '@navet/app/hooks/use-theme';

export interface MapWidgetSurfaceTokens {
  tileOpacity: string;
  tileFilter: string;
  attributionBg: string;
  attributionText: string;
  attributionBorder: string;
  popupBg: string;
  popupText: string;
  popupBorder: string;
  popupShadow: string;
  lightOverlayBg?: string;
}

export function getMapWidgetSurfaceTokens(theme: ThemeType): MapWidgetSurfaceTokens {
  if (theme === 'light') {
    return {
      tileOpacity: '0.94',
      tileFilter: 'saturate(0.88) contrast(0.94) brightness(1.03)',
      attributionBg: 'rgba(255,255,255,0.9)',
      attributionText: 'rgb(100 116 139)',
      attributionBorder: 'rgba(203,213,225,0.8)',
      popupBg: 'rgba(255,255,255,0.94)',
      popupText: 'rgb(15 23 42)',
      popupBorder: 'rgba(148,163,184,0.28)',
      popupShadow: '0 20px 36px -24px rgba(15,23,42,0.22)',
      lightOverlayBg:
        'linear-gradient(180deg, rgba(255,255,255,0.22) 0%, rgba(255,255,255,0.08) 18%, rgba(255,255,255,0.03) 45%, rgba(248,250,252,0.12) 100%)',
    };
  }

  if (theme === 'glass') {
    return {
      tileOpacity: '0.9',
      tileFilter: 'saturate(0.82) contrast(0.94) brightness(0.94)',
      attributionBg: 'rgba(2, 6, 16, 0.68)',
      attributionText: 'rgba(255,255,255,0.6)',
      attributionBorder: 'rgba(255,255,255,0.1)',
      popupBg: 'rgba(11,18,32,0.88)',
      popupText: 'rgba(255,255,255,0.92)',
      popupBorder: 'rgba(255,255,255,0.14)',
      popupShadow: '0 18px 34px -24px rgba(2,8,20,0.72)',
      lightOverlayBg:
        'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 18%, rgba(255,255,255,0.015) 45%, rgba(2,6,16,0.10) 100%)',
    };
  }

  if (theme === 'black') {
    return {
      tileOpacity: '0.9',
      tileFilter: 'saturate(0.82) contrast(0.94) brightness(0.94)',
      attributionBg: 'rgba(0, 0, 0, 0.72)',
      attributionText: 'rgb(113 113 122)',
      attributionBorder: 'rgba(255,255,255,0.08)',
      popupBg: 'rgba(11,18,32,0.88)',
      popupText: 'rgba(255,255,255,0.92)',
      popupBorder: 'rgba(255,255,255,0.14)',
      popupShadow: '0 18px 34px -24px rgba(2,8,20,0.72)',
      lightOverlayBg:
        'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 18%, rgba(255,255,255,0.015) 45%, rgba(2,6,16,0.10) 100%)',
    };
  }

  // dark theme
  return {
    tileOpacity: '0.9',
    tileFilter: 'saturate(0.82) contrast(0.94) brightness(0.94)',
    attributionBg: 'rgba(9, 9, 11, 0.78)',
    attributionText: 'rgb(113 113 122)',
    attributionBorder: 'rgba(39,39,42,1)',
    popupBg: 'rgba(11,18,32,0.88)',
    popupText: 'rgba(255,255,255,0.92)',
    popupBorder: 'rgba(255,255,255,0.14)',
    popupShadow: '0 18px 34px -24px rgba(2,8,20,0.72)',
    lightOverlayBg:
      'linear-gradient(180deg, rgba(255,255,255,0.12) 0%, rgba(255,255,255,0.04) 18%, rgba(255,255,255,0.015) 45%, rgba(2,6,16,0.10) 100%)',
  };
}

export interface MapControlSurfaceTokens {
  settingsButtonClassName: string;
  emptyStateIconClassName: string;
  attributionClassName: string;
  smallAttributionClassName: string;
}

export function getMapControlSurfaceTokens(
  theme: ThemeType,
  baseSurface: {
    border: string;
    panel: string;
    textMuted: string;
    textSecondary: string;
    panelClassName?: string;
  },
  cardShell: {
    backdropClassName: string;
  }
): MapControlSurfaceTokens {
  const baseClassName = `${baseSurface.border} ${baseSurface.panel} ${cardShell.backdropClassName}`;

  return {
    settingsButtonClassName: `${baseClassName} ${baseSurface.textSecondary}`,
    emptyStateIconClassName: theme === 'light' ? 'text-slate-400' : baseSurface.textMuted,
    attributionClassName:
      theme === 'light'
        ? `${baseClassName} ${baseSurface.textMuted}`
        : theme === 'glass'
          ? 'border-white/10 bg-slate-950/68 text-white/60 backdrop-blur-xl'
          : theme === 'black'
            ? 'border-white/8 bg-black/72 text-zinc-500'
            : 'border-zinc-800 bg-zinc-950/78 text-zinc-500',
    smallAttributionClassName:
      'bottom-1.5 left-1.5 rounded-[10px] rounded-bl-[16px] px-1.5 py-1 text-[9px] leading-none whitespace-nowrap',
  };
}
