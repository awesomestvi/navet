import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@navet/app/hooks/use-theme';

type PersonState = 'home' | 'away';

interface PersonCardSurfaceTokens {
  containerShadowClassName: string;
  overlayClassName: string | null;
  fallbackBackgroundClassName: string;
  fallbackIconContainerClassName: string;
  fallbackIconClassName: string;
  fallbackScrimClassName: string;
}

export function getPersonCardSurfaceTokens(
  theme: ThemeType,
  state: PersonState
): PersonCardSurfaceTokens {
  const surface = getThemeSurfaceTokens(theme);
  const isHome = state === 'home';

  return {
    containerShadowClassName: surface.cardShadow,
    overlayClassName: theme === 'light' ? surface.lightOverlay : null,
    fallbackBackgroundClassName:
      theme === 'light'
        ? isHome
          ? 'from-sky-100 via-slate-100 to-white'
          : 'from-slate-200 via-slate-100 to-white'
        : theme === 'glass'
          ? isHome
            ? 'from-sky-300/14 via-white/[0.045] to-transparent'
            : 'from-white/10 via-white/[0.035] to-transparent'
          : isHome
            ? 'from-sky-500/30 via-slate-900 to-slate-950'
            : 'from-slate-500/25 via-slate-900 to-slate-950',
    fallbackIconContainerClassName:
      theme === 'light'
        ? 'border-slate-300/70 bg-white/54'
        : theme === 'glass'
          ? `border-white/18 ${surface.iconBg}`
          : 'border-white/12 bg-black/10',
    fallbackIconClassName:
      theme === 'light' ? 'text-slate-600' : isHome ? 'text-white/82' : 'text-white/76',
    fallbackScrimClassName:
      theme === 'glass'
        ? 'from-slate-950/42 via-slate-950/14 to-transparent'
        : 'from-black/88 via-black/38 to-transparent',
  };
}
