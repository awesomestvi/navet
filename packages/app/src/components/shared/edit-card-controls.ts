import type { ThemeType } from '@navet/app/hooks/use-theme';
import type { CardSize } from './card-size';

export type EditControlVariant =
  | 'neutral'
  | 'destructive'
  | 'warning'
  | 'accent'
  | 'success'
  | 'locked';
export type EditControlPlacement = 'top-left' | 'top-right' | 'bottom-left' | 'bottom-right';

export function getEditControlLayout(size: CardSize) {
  if (size === 'tiny') {
    return {
      isCompact: true,
      topLeftPosition: 'top-2 left-2',
      topRightPosition: 'top-2 right-2',
      bottomLeftPosition: 'bottom-2 left-2',
      bottomRightPosition: 'right-2 bottom-2',
      buttonSize: 'h-8 w-8',
      iconSize: 'w-3.5 h-3.5',
    };
  }

  if (size === 'extra-small') {
    return {
      isCompact: true,
      topLeftPosition: 'top-3 left-3',
      topRightPosition: 'top-3 right-3',
      bottomLeftPosition: 'bottom-3 left-3',
      bottomRightPosition: 'right-3 bottom-3',
      buttonSize: 'h-8 w-8',
      iconSize: 'w-3.5 h-3.5',
    };
  }

  return {
    isCompact: true,
    topLeftPosition: 'top-3 left-3',
    topRightPosition: 'top-3 right-3',
    bottomLeftPosition: 'bottom-3 left-3',
    bottomRightPosition: 'right-3 bottom-3',
    buttonSize: 'h-8 w-8',
    iconSize: 'w-3.5 h-3.5',
  };
}

export function getEditControlButtonClass(
  variant: EditControlVariant = 'neutral',
  theme?: ThemeType
) {
  const baseClass =
    'rounded-full border flex items-center justify-center transition-all duration-200 hover:scale-[1.02] active:scale-[0.98]';

  if (theme === 'glass') {
    if (variant === 'destructive') {
      return `${baseClass} border-white/18 bg-[linear-gradient(180deg,rgba(255,148,163,0.26),rgba(126,18,27,0.18)_100%)] text-rose-50 shadow-[0_18px_38px_-24px_rgba(10,14,26,0.82),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(255,148,163,0.3),rgba(126,18,27,0.22)_100%)]`;
    }

    if (variant === 'warning') {
      return `${baseClass} border-white/18 bg-[linear-gradient(180deg,rgba(251,191,36,0.24),rgba(146,64,14,0.18)_100%)] text-amber-50 shadow-[0_18px_38px_-24px_rgba(10,14,26,0.82),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(251,191,36,0.28),rgba(146,64,14,0.22)_100%)]`;
    }

    if (variant === 'accent') {
      return `${baseClass} border-white/18 bg-[linear-gradient(180deg,rgba(56,189,248,0.24),rgba(12,74,110,0.18)_100%)] text-sky-50 shadow-[0_18px_38px_-24px_rgba(10,14,26,0.82),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(56,189,248,0.28),rgba(12,74,110,0.22)_100%)]`;
    }

    if (variant === 'success') {
      return `${baseClass} border-white/18 bg-[linear-gradient(180deg,rgba(52,211,153,0.24),rgba(6,78,59,0.18)_100%)] text-emerald-50 shadow-[0_18px_38px_-24px_rgba(10,14,26,0.82),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(52,211,153,0.28),rgba(6,78,59,0.22)_100%)]`;
    }

    if (variant === 'locked') {
      return `${baseClass} border-white/18 bg-[linear-gradient(180deg,rgba(167,139,250,0.24),rgba(76,29,149,0.18)_100%)] text-violet-50 shadow-[0_18px_38px_-24px_rgba(10,14,26,0.82),inset_0_1px_0_rgba(255,255,255,0.2)] backdrop-blur-2xl hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(167,139,250,0.28),rgba(76,29,149,0.22)_100%)]`;
    }

    return `${baseClass} border-white/18 bg-[linear-gradient(180deg,rgba(255,255,255,0.2),rgba(255,255,255,0.08)_58%,rgba(255,255,255,0.04)_100%)] text-white shadow-[0_18px_38px_-24px_rgba(10,14,26,0.82),inset_0_1px_0_rgba(255,255,255,0.22)] backdrop-blur-2xl hover:border-white/24 hover:bg-[linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.1)_58%,rgba(255,255,255,0.05)_100%)]`;
  }

  if (variant === 'destructive') {
    return `${baseClass} border-rose-500/26 bg-[#221417] text-rose-100 hover:border-rose-400/34 hover:bg-[#2a171c]`;
  }

  if (variant === 'warning') {
    return `${baseClass} border-amber-500/26 bg-[#241b12] text-amber-100 hover:border-amber-400/34 hover:bg-[#2b2014]`;
  }

  if (variant === 'accent') {
    return `${baseClass} border-sky-500/26 bg-[#13202b] text-sky-100 hover:border-sky-400/34 hover:bg-[#162734]`;
  }

  if (variant === 'success') {
    return `${baseClass} border-emerald-500/26 bg-[#13211b] text-emerald-100 hover:border-emerald-400/34 hover:bg-[#162822]`;
  }

  if (variant === 'locked') {
    return `${baseClass} border-violet-500/26 bg-[#1a1626] text-violet-100 hover:border-violet-400/34 hover:bg-[#201a2d]`;
  }

  return `${baseClass} border-white/10 bg-[#18181b] text-white hover:border-white/16 hover:bg-[#202024]`;
}
