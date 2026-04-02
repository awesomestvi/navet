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
    blackGradient: string;
    lightGlowClassName: string;
    darkGlowClassName: string;
    glassGlowClassName: string;
    blackGlowClassName: string;
  }
> = {
  yellow: {
    lightGradient: 'from-yellow-50 via-yellow-50 to-amber-100/90',
    darkGradient: 'from-yellow-900 to-yellow-950',
    darkBorder: 'border-yellow-700',
    glassGradient: 'from-white/16 via-yellow-200/10 to-white/[0.03]',
    blackGradient: 'from-black via-black to-yellow-950/55',
    lightGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(250,204,21,0.18),transparent_32%),linear-gradient(155deg,rgba(245,158,11,0.08),transparent_58%)]',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(253,224,71,0.16),transparent_32%),linear-gradient(155deg,rgba(250,204,21,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-cyan-300/10 to-transparent',
    blackGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(250,204,21,0.16),transparent_28%),linear-gradient(155deg,rgba(250,204,21,0.05),transparent_58%)]',
  },
  green: {
    lightGradient: 'from-green-50 via-green-50 to-emerald-100/90',
    darkGradient: 'from-green-900 to-green-950',
    darkBorder: 'border-green-700',
    glassGradient: 'from-white/16 via-green-200/10 to-white/[0.03]',
    blackGradient: 'from-black via-black to-green-950/55',
    lightGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(34,197,94,0.18),transparent_32%),linear-gradient(155deg,rgba(16,185,129,0.08),transparent_58%)]',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(74,222,128,0.16),transparent_32%),linear-gradient(155deg,rgba(34,197,94,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-green-300/10 to-transparent',
    blackGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(34,197,94,0.16),transparent_28%),linear-gradient(155deg,rgba(34,197,94,0.05),transparent_58%)]',
  },
  teal: {
    lightGradient: 'from-teal-50 via-teal-50 to-cyan-100/90',
    darkGradient: 'from-teal-900 to-teal-950',
    darkBorder: 'border-teal-700',
    glassGradient: 'from-white/16 via-teal-200/10 to-white/[0.03]',
    blackGradient: 'from-black via-black to-teal-950/55',
    lightGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(20,184,166,0.18),transparent_32%),linear-gradient(155deg,rgba(6,182,212,0.08),transparent_58%)]',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(45,212,191,0.16),transparent_32%),linear-gradient(155deg,rgba(20,184,166,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-teal-300/10 to-transparent',
    blackGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(20,184,166,0.16),transparent_28%),linear-gradient(155deg,rgba(20,184,166,0.05),transparent_58%)]',
  },
  blue: {
    lightGradient: 'from-sky-50 via-sky-50 to-blue-100/90',
    darkGradient: 'from-slate-950 via-slate-900 to-sky-900/92',
    darkBorder: 'border-sky-700/70',
    glassGradient: 'from-white/16 via-sky-200/10 to-blue-200/[0.07]',
    blackGradient: 'from-black via-black to-sky-950/55',
    lightGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(56,189,248,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.10),transparent_26%),linear-gradient(155deg,rgba(14,165,233,0.08),transparent_60%)]',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(125,211,252,0.18),transparent_30%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.12),transparent_26%),linear-gradient(155deg,rgba(14,165,233,0.08),transparent_60%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-sky-300/12 to-blue-200/08',
    blackGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(56,189,248,0.18),transparent_28%),radial-gradient(circle_at_82%_18%,rgba(59,130,246,0.12),transparent_24%),linear-gradient(155deg,rgba(14,165,233,0.05),transparent_60%)]',
  },
  purple: {
    lightGradient: 'from-purple-50 via-purple-50 to-fuchsia-100/90',
    darkGradient: 'from-purple-900 to-purple-950',
    darkBorder: 'border-purple-700',
    glassGradient: 'from-white/16 via-purple-200/10 to-white/[0.03]',
    blackGradient: 'from-black via-black to-purple-950/55',
    lightGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(168,85,247,0.18),transparent_32%),linear-gradient(155deg,rgba(217,70,239,0.08),transparent_58%)]',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(192,132,252,0.16),transparent_32%),linear-gradient(155deg,rgba(168,85,247,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-purple-300/10 to-transparent',
    blackGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(168,85,247,0.16),transparent_28%),linear-gradient(155deg,rgba(168,85,247,0.05),transparent_58%)]',
  },
  amber: {
    lightGradient: 'from-amber-50 via-amber-50 to-orange-100/90',
    darkGradient: 'from-amber-900 to-amber-950',
    darkBorder: 'border-amber-700',
    glassGradient: 'from-white/16 via-amber-200/10 to-white/[0.03]',
    blackGradient: 'from-black via-black to-amber-950/55',
    lightGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(245,158,11,0.18),transparent_32%),linear-gradient(155deg,rgba(249,115,22,0.08),transparent_58%)]',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(251,191,36,0.16),transparent_32%),linear-gradient(155deg,rgba(245,158,11,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-amber-300/10 to-transparent',
    blackGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(245,158,11,0.16),transparent_28%),linear-gradient(155deg,rgba(245,158,11,0.05),transparent_58%)]',
  },
  emerald: {
    lightGradient: 'from-emerald-50 via-emerald-50 to-green-100/90',
    darkGradient: 'from-emerald-900 to-emerald-950',
    darkBorder: 'border-emerald-700',
    glassGradient: 'from-white/16 via-emerald-200/10 to-white/[0.03]',
    blackGradient: 'from-black via-black to-emerald-950/55',
    lightGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(16,185,129,0.18),transparent_32%),linear-gradient(155deg,rgba(34,197,94,0.08),transparent_58%)]',
    darkGlowClassName:
      'bg-[radial-gradient(circle_at_16%_14%,rgba(52,211,153,0.16),transparent_32%),linear-gradient(155deg,rgba(16,185,129,0.08),transparent_58%)]',
    glassGlowClassName: 'bg-gradient-to-br from-white/10 via-emerald-300/10 to-transparent',
    blackGlowClassName:
      'bg-[radial-gradient(circle_at_14%_12%,rgba(16,185,129,0.16),transparent_28%),linear-gradient(155deg,rgba(16,185,129,0.05),transparent_58%)]',
  },
};

export function getAccentCardShellTokens(theme: ThemeType, accent: AccentFamily): AccentCardShell {
  const surface = getThemeSurfaceTokens(theme);
  const config = ACCENT_CONFIG[accent];

  if (theme === 'light') {
    return {
      containerClassName: `bg-gradient-to-br ${config.lightGradient} border-gray-200 shadow-lg`,
      glowClassName: config.lightGlowClassName,
      overlayClassName:
        'bg-[linear-gradient(180deg,rgba(255,255,255,0.45),rgba(255,255,255,0.12)_32%,transparent_72%)]',
    };
  }

  if (theme === 'glass') {
    return {
      containerClassName: `bg-gradient-to-br ${config.glassGradient} ${surface.border}`,
      glowClassName: config.glassGlowClassName,
      overlayClassName: 'bg-white/[0.03]',
    };
  }

  if (theme === 'black') {
    return {
      containerClassName: `bg-gradient-to-br ${config.blackGradient} border-white/16`,
      glowClassName: config.blackGlowClassName,
      overlayClassName:
        'bg-[linear-gradient(180deg,rgba(255,255,255,0.04),rgba(255,255,255,0.012)_34%,transparent_68%)]',
    };
  }

  return {
    containerClassName: `bg-gradient-to-br ${config.darkGradient} ${config.darkBorder}`,
    glowClassName: config.darkGlowClassName,
    overlayClassName:
      'bg-[linear-gradient(180deg,rgba(255,255,255,0.06),rgba(255,255,255,0.015)_34%,transparent_68%)]',
  };
}
