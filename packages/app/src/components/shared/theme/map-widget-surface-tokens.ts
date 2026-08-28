import type { ThemeType } from '@navet/app/hooks/use-theme';

export interface MapWidgetSurfaceTokens {
  tileOpacity: string;
  tileFilter: string;
  popupBg: string;
  popupText: string;
  popupBorder: string;
  popupShadow: string;
}

export function getMapWidgetSurfaceTokens(theme: ThemeType): MapWidgetSurfaceTokens {
  if (theme === 'light') {
    return {
      tileOpacity: '1',
      tileFilter: 'saturate(0.92) contrast(1.04)',
      popupBg: 'rgba(255,255,255,0.94)',
      popupText: 'rgb(15 23 42)',
      popupBorder: 'rgba(148,163,184,0.28)',
      popupShadow: '0 20px 36px -24px rgba(15,23,42,0.22)',
    };
  }

  if (theme === 'glass') {
    return {
      tileOpacity: '1',
      tileFilter: 'saturate(0.94) contrast(1.02) brightness(1.24)',
      popupBg: 'rgba(11,18,32,0.88)',
      popupText: 'rgba(255,255,255,0.92)',
      popupBorder: 'rgba(255,255,255,0.14)',
      popupShadow: '0 18px 34px -24px rgba(2,8,20,0.72)',
    };
  }

  if (theme === 'black') {
    return {
      tileOpacity: '1',
      tileFilter: 'saturate(0.94) contrast(1.02) brightness(1.5)',
      popupBg: 'rgba(11,18,32,0.88)',
      popupText: 'rgba(255,255,255,0.92)',
      popupBorder: 'rgba(255,255,255,0.14)',
      popupShadow: '0 18px 34px -24px rgba(2,8,20,0.72)',
    };
  }

  // dark theme
  return {
    tileOpacity: '1',
    tileFilter: 'saturate(0.94) contrast(1.02) brightness(1.4)',
    popupBg: 'rgba(11,18,32,0.88)',
    popupText: 'rgba(255,255,255,0.92)',
    popupBorder: 'rgba(255,255,255,0.14)',
    popupShadow: '0 18px 34px -24px rgba(2,8,20,0.72)',
  };
}

export interface MapControlSurfaceTokens {
  settingsButtonClassName: string;
  emptyStateIconClassName: string;
  attributionClassName: string;
  attributionPositionClassName: string;
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
    attributionClassName: 'drop-shadow-[0_1px_2px_rgba(0,0,0,0.95)]',
    attributionPositionClassName:
      'bottom-1.5 left-1.5 flex w-fit max-w-[calc(100%-0.75rem)] flex-wrap items-center gap-x-1 gap-y-0.5 text-[9px] leading-none',
  };
}
