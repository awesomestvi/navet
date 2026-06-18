import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@navet/app/hooks/use-theme';

export interface BaseCardDialogSurface {
  panel: string;
  border: string;
}

export function getBaseCardDialogSurface(theme: ThemeType): BaseCardDialogSurface {
  if (theme === 'light') {
    return {
      panel: 'bg-linear-to-br from-white to-slate-50',
      border: 'border-slate-300/80',
    };
  }

  if (theme === 'black') {
    return {
      panel: 'bg-linear-to-br from-black via-black to-black',
      border: 'border-white/6',
    };
  }

  if (theme === 'dark') {
    return {
      panel: 'bg-[linear-gradient(135deg,rgb(24,24,27)_0%,rgb(9,9,11)_100%)]',
      border: 'border-zinc-700/70',
    };
  }

  const surface = getThemeSurfaceTokens(theme);
  return {
    panel: surface.panel,
    border: surface.border,
  };
}
