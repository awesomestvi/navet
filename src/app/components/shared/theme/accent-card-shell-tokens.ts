import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks/use-theme';

type AccentCardShell = {
  containerClassName: string;
  glowClassName: string;
  overlayClassName: string | null;
};

type AccentFamily = 'yellow' | 'green' | 'teal' | 'blue' | 'purple' | 'amber' | 'emerald';

const ACCENT_CONFIG: Record<
  AccentFamily,
  {
    lightGradient: string;
    darkGradient: string;
    darkBorder: string;
    glassGradient: string;
    lightGlowClassName: string;
    darkGlowClassName: string;
    glassGlowClassName: string;
  }
> = {
  yellow: {
    lightGradient: 'from-white to-yellow-50',
    darkGradient: 'from-yellow-900 to-yellow-950',
    darkBorder: 'border-yellow-700',
    glassGradient: 'from-white/16 via-yellow-200/10 to-white/[0.03]',
    lightGlowClassName: 'bg-gradient-to-br from-yellow-50/40 to-transparent',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(253,224,71,0.16),transparent_32%),linear-gradient(155deg,rgba(250,204,21,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-cyan-300/10 to-transparent',
  },
  green: {
    lightGradient: 'from-white to-green-50',
    darkGradient: 'from-green-900 to-green-950',
    darkBorder: 'border-green-700',
    glassGradient: 'from-white/16 via-green-200/10 to-white/[0.03]',
    lightGlowClassName: 'bg-gradient-to-br from-green-50/40 to-transparent',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(74,222,128,0.16),transparent_32%),linear-gradient(155deg,rgba(34,197,94,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-green-300/10 to-transparent',
  },
  teal: {
    lightGradient: 'from-white to-teal-50',
    darkGradient: 'from-teal-900 to-teal-950',
    darkBorder: 'border-teal-700',
    glassGradient: 'from-white/16 via-teal-200/10 to-white/[0.03]',
    lightGlowClassName: 'bg-gradient-to-br from-teal-50/40 to-transparent',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(45,212,191,0.16),transparent_32%),linear-gradient(155deg,rgba(20,184,166,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-teal-300/10 to-transparent',
  },
  blue: {
    lightGradient: 'from-white to-sky-50/85',
    darkGradient: 'from-slate-950 via-slate-900 to-sky-900/92',
    darkBorder: 'border-sky-700/70',
    glassGradient: 'from-white/16 via-sky-200/10 to-blue-200/[0.07]',
    lightGlowClassName: 'bg-gradient-to-br from-sky-100/40 via-transparent to-blue-100/28',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(125,211,252,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.12),transparent_26%),linear-gradient(155deg,rgba(14,165,233,0.08),transparent_60%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-sky-300/12 to-blue-200/08',
  },
  purple: {
    lightGradient: 'from-white to-purple-50',
    darkGradient: 'from-purple-900 to-purple-950',
    darkBorder: 'border-purple-700',
    glassGradient: 'from-white/16 via-purple-200/10 to-white/[0.03]',
    lightGlowClassName: 'bg-gradient-to-br from-purple-50/40 to-transparent',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(192,132,252,0.16),transparent_32%),linear-gradient(155deg,rgba(168,85,247,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-purple-300/10 to-transparent',
  },
  amber: {
    lightGradient: 'from-white to-amber-50',
    darkGradient: 'from-amber-900 to-amber-950',
    darkBorder: 'border-amber-700',
    glassGradient: 'from-white/16 via-amber-200/10 to-white/[0.03]',
    lightGlowClassName: 'bg-gradient-to-br from-amber-50/40 to-transparent',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(251,191,36,0.16),transparent_32%),linear-gradient(155deg,rgba(245,158,11,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-amber-300/10 to-transparent',
  },
  emerald: {
    lightGradient: 'from-white to-emerald-50',
    darkGradient: 'from-emerald-900 to-emerald-950',
    darkBorder: 'border-emerald-700',
    glassGradient: 'from-white/16 via-emerald-200/10 to-white/[0.03]',
    lightGlowClassName: 'bg-gradient-to-br from-emerald-50/40 to-transparent',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(52,211,153,0.16),transparent_32%),linear-gradient(155deg,rgba(16,185,129,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-emerald-300/10 to-transparent',
  },
};

export function getAccentCardShellTokens(theme: ThemeType, accent: AccentFamily): AccentCardShell {
  const surface = getThemeSurfaceTokens(theme);
  const config = ACCENT_CONFIG[accent];

  if (theme === 'light') {
    return {
      containerClassName: `bg-gradient-to-br ${config.lightGradient} border-gray-200 shadow-lg`,
      glowClassName: config.lightGlowClassName,
      overlayClassName: null,
    };
  }

  if (theme === 'glass') {
    return {
      containerClassName: `bg-gradient-to-br ${config.glassGradient} ${surface.border}`,
      glowClassName: config.glassGlowClassName,
      overlayClassName: 'bg-white/[0.03]',
    };
  }

  return {
    containerClassName: `bg-gradient-to-br ${config.darkGradient} ${config.darkBorder}`,
    glowClassName: config.darkGlowClassName,
    overlayClassName:
      'bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015)_34%,transparent_68%)]',
  };
}
