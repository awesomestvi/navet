import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@navet/app/hooks/use-theme';

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
