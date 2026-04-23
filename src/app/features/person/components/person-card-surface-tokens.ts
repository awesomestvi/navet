import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

type PersonState = 'home' | 'away';

interface PersonCardSurfaceTokens {
  containerShadowClassName: string;
  overlayClassName: string | null;
  fallbackBackgroundClassName: string;
  fallbackIconClassName: string;
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
        : isHome
          ? 'from-sky-500/30 via-slate-900 to-slate-950'
          : 'from-slate-500/25 via-slate-900 to-slate-950',
    fallbackIconClassName:
      theme === 'light' ? 'text-slate-600' : isHome ? 'text-white/82' : 'text-white/76',
  };
}
