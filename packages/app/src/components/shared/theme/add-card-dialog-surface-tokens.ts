import type { ThemeType } from '@navet/app/hooks/use-theme';

export interface AddCardDialogSurfaceTokens {
  inactiveIconBg: string;
  inactiveIconColor: string;
  sizePreviewTileBg: string;
  inactiveSizeSwatchBg: string;
  activeTabIndicator: string;
  searchInputBg: string;
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
  };
}
