import type { ThemeType } from '@/app/hooks/use-theme';
import type { VacuumStatus } from './vacuum-utils';

function getVacuumFallbackSurface(theme: ThemeType, status: VacuumStatus) {
  if (theme === 'light') {
    return {
      panel: 'bg-[linear-gradient(180deg,rgba(255,255,255,0.98),rgba(240,249,255,0.96))]',
      border: 'border-gray-200',
      glow: '',
    };
  }

  if (theme === 'glass') {
    if (status === 'returning') {
      return {
        panel: 'bg-gradient-to-br from-white/24 via-indigo-200/18 to-white/10',
        border: 'border-white/22',
        glow: 'from-indigo-200/18',
      };
    }

    if (status === 'paused') {
      return {
        panel: 'bg-gradient-to-br from-white/24 via-yellow-200/18 to-white/10',
        border: 'border-white/22',
        glow: 'from-yellow-200/18',
      };
    }

    return {
      panel: 'bg-gradient-to-br from-white/24 via-cyan-200/18 to-white/10',
      border: 'border-white/22',
      glow: 'from-cyan-200/18',
    };
  }

  if (theme === 'black') {
    if (status === 'returning') {
      return {
        panel: 'bg-gradient-to-br from-black via-black to-indigo-950',
        border: 'border-zinc-700',
        glow: 'from-indigo-500/12',
      };
    }

    if (status === 'paused') {
      return {
        panel: 'bg-gradient-to-br from-black via-black to-yellow-950',
        border: 'border-zinc-700',
        glow: 'from-yellow-500/10',
      };
    }

    return {
      panel: 'bg-gradient-to-br from-black via-black to-cyan-950',
      border: 'border-zinc-700',
      glow: 'from-cyan-500/10',
    };
  }

  if (status === 'returning') {
    return {
      panel: 'bg-gradient-to-br from-indigo-900/90 via-purple-950/95 to-purple-950/95',
      border: 'border-indigo-700/30',
      glow: 'from-indigo-500/10',
    };
  }

  if (status === 'paused') {
    return {
      panel: 'bg-gradient-to-br from-yellow-900 to-yellow-950',
      border: 'border-yellow-700/30',
      glow: 'from-yellow-500/10',
    };
  }

  return {
    panel: 'bg-gradient-to-br from-cyan-900 to-cyan-950',
    border: 'border-cyan-700/30',
    glow: 'from-cyan-500/10',
  };
}

export function getVacuumSettingsDialogSurface(theme: ThemeType, status: VacuumStatus = 'docked') {
  const fallbackSurface = getVacuumFallbackSurface(theme, status);

  return {
    contentClassName: fallbackSurface.panel,
    contentBorderClassName: fallbackSurface.border,
    contentGlowClassName: fallbackSurface.glow,
  };
}
