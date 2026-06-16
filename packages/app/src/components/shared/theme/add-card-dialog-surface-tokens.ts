import type { ThemeType } from '@navet/app/hooks/use-theme';

export interface AddCardDialogSurfaceTokens {
  inactiveIconBg: string;
  inactiveIconColor: string;
  sizePreviewTileBg: string;
  inactiveSizeSwatchBg: string;
  activeTabIndicator: string;
  searchInputBg: string;
  shellBackground: string;
  sectionBackground: string;
  tileBackground: string;
  tileBorder: string;
  iconBackground: string;
  footerBackground: string;
}

export function getAddCardDialogSurfaceTokens(theme: ThemeType): AddCardDialogSurfaceTokens {
  if (theme === 'light') {
    return {
      inactiveIconBg: '#f3f4f6',
      inactiveIconColor: '#374151',
      sizePreviewTileBg: 'rgba(15,23,42,0.04)',
      inactiveSizeSwatchBg: '#d1d5db',
      activeTabIndicator: '#f97316',
      searchInputBg: 'rgba(255,255,255,0.6)',
      shellBackground: 'rgba(255,255,255,0.98)',
      sectionBackground: 'rgba(248,250,252,0.9)',
      tileBackground: 'rgba(255,255,255,0.92)',
      tileBorder: 'rgba(148,163,184,0.18)',
      iconBackground: 'rgba(248,250,252,0.96)',
      footerBackground: 'rgba(255,255,255,0.92)',
    };
  }

  if (theme === 'black') {
    return {
      inactiveIconBg: 'rgba(255, 255, 255, 0.05)',
      inactiveIconColor: 'rgba(255, 255, 255, 0.78)',
      sizePreviewTileBg: 'rgba(255,255,255,0.03)',
      inactiveSizeSwatchBg: 'rgba(255, 255, 255, 0.2)',
      activeTabIndicator: '#f97316',
      searchInputBg: 'rgba(255,255,255,0.05)',
      shellBackground: 'rgba(8,10,14,0.98)',
      sectionBackground: 'rgba(255,255,255,0.03)',
      tileBackground: 'rgba(255,255,255,0.035)',
      tileBorder: 'rgba(255,255,255,0.07)',
      iconBackground: 'rgba(255,255,255,0.05)',
      footerBackground: 'rgba(5,8,12,0.88)',
    };
  }

  if (theme === 'glass') {
    return {
      inactiveIconBg: 'rgba(255, 255, 255, 0.08)',
      inactiveIconColor: 'rgba(255, 255, 255, 0.78)',
      sizePreviewTileBg: 'rgba(255,255,255,0.04)',
      inactiveSizeSwatchBg: 'rgba(255, 255, 255, 0.18)',
      activeTabIndicator: '#f97316',
      searchInputBg: 'rgba(255,255,255,0.08)',
      shellBackground: 'rgba(17,24,39,0.92)',
      sectionBackground: 'rgba(255,255,255,0.04)',
      tileBackground: 'rgba(255,255,255,0.05)',
      tileBorder: 'rgba(255,255,255,0.09)',
      iconBackground: 'rgba(255,255,255,0.07)',
      footerBackground: 'rgba(15,23,42,0.72)',
    };
  }

  // Dark theme
  return {
    inactiveIconBg: 'rgba(255, 255, 255, 0.05)',
    inactiveIconColor: 'rgba(255, 255, 255, 0.78)',
    sizePreviewTileBg: 'rgba(255,255,255,0.03)',
    inactiveSizeSwatchBg: 'rgba(255, 255, 255, 0.2)',
    activeTabIndicator: '#f97316',
    searchInputBg: 'rgba(255,255,255,0.06)',
    shellBackground: 'rgba(10,15,22,0.98)',
    sectionBackground: 'rgba(255,255,255,0.035)',
    tileBackground: 'rgba(255,255,255,0.04)',
    tileBorder: 'rgba(255,255,255,0.08)',
    iconBackground: 'rgba(255,255,255,0.06)',
    footerBackground: 'rgba(8,13,20,0.9)',
  };
}
