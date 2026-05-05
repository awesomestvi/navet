import type { ThemeType } from '@/app/hooks/use-theme';
import type { EffectsQuality } from '@/app/stores/settings-store';

export interface ThemeSurfaceTokens {
  appBg: string;
  shellPanel: string;
  panel: string;
  panelMuted: string;
  border: string;
  borderStrong: string;
  divider: string;
  textPrimary: string;
  textSecondary: string;
  textSubtle: string;
  textMuted: string;
  iconBg: string;
  subtleBg: string;
  hoverBg: string;
  inputBg: string;
  placeholder: string;
  cardShadow: string;
  lightOverlay: string | null;
  dialogBackdrop: string;
  ringOffset: string;
}

const getCurrentEffectsQuality = (): EffectsQuality => {
  if (typeof document === 'undefined') {
    return 'high';
  }

  const value = document.documentElement.dataset.effectsQuality;
  return value === 'medium' || value === 'low' ? value : 'high';
};

export function getThemeSurfaceTokens(
  theme: ThemeType,
  effectsQuality: EffectsQuality = getCurrentEffectsQuality()
): ThemeSurfaceTokens {
  if (theme === 'light') {
    return {
      appBg: 'bg-stone-50',
      shellPanel: 'bg-white border-slate-300/80',
      panel: 'bg-white',
      panelMuted: 'bg-slate-50',
      border: 'border-slate-300/80',
      borderStrong: 'border-slate-300',
      divider: 'divide-slate-300/80',
      textPrimary: 'text-slate-950',
      textSecondary: 'text-slate-700',
      textSubtle: 'text-slate-600',
      textMuted: 'text-slate-500',
      iconBg: 'bg-slate-100',
      subtleBg: 'bg-slate-100/90',
      hoverBg: 'hover:bg-slate-100',
      inputBg: 'bg-slate-100/95',
      placeholder: 'placeholder-slate-400',
      cardShadow:
        effectsQuality === 'high'
          ? 'shadow-[0_22px_44px_-28px_rgba(15,23,42,0.22),0_8px_16px_-14px_rgba(15,23,42,0.14)]'
          : effectsQuality === 'medium'
            ? 'shadow-[0_16px_32px_-26px_rgba(15,23,42,0.18)]'
            : '',
      lightOverlay: null,
      dialogBackdrop: 'bg-black/48',
      ringOffset: 'ring-offset-white',
    };
  }

  if (theme === 'black') {
    return {
      appBg: 'bg-black',
      shellPanel: 'bg-black border-white/6',
      panel: 'bg-black',
      panelMuted: 'bg-black',
      border: 'border-white/6',
      borderStrong: 'border-white/8',
      divider: 'divide-white/10',
      textPrimary: 'text-white',
      textSecondary: 'text-gray-300',
      textSubtle: 'text-zinc-300',
      textMuted: 'text-zinc-300',
      iconBg: 'bg-zinc-900',
      subtleBg: 'bg-black',
      hoverBg: 'hover:bg-zinc-900',
      inputBg: 'bg-black',
      placeholder: 'placeholder-gray-400',
      cardShadow: '',
      lightOverlay: null,
      dialogBackdrop: 'bg-black/60',
      ringOffset: 'ring-offset-black',
    };
  }

  if (theme === 'glass') {
    const isHigh = effectsQuality === 'high';
    const isMedium = effectsQuality === 'medium';

    return {
      appBg: 'bg-slate-950',
      shellPanel: isHigh
        ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.22),rgba(255,255,255,0.09)_18%,rgba(255,255,255,0.04)_48%,rgba(10,18,30,0.12)_100%)] border-white/22 shadow-[0_28px_70px_-40px_rgba(2,8,20,0.86),inset_0_1px_0_rgba(255,255,255,0.26),inset_0_-18px_28px_rgba(255,255,255,0.04)]'
        : isMedium
          ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06)_24%,rgba(255,255,255,0.025)_100%)] border-white/16 shadow-[0_22px_52px_-36px_rgba(2,8,20,0.78),inset_0_1px_0_rgba(255,255,255,0.16)]'
          : 'bg-slate-950/94 border-white/10',
      panel: isHigh
        ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.18),rgba(255,255,255,0.08)_18%,rgba(255,255,255,0.03)_46%,rgba(8,14,24,0.08)_100%)]'
        : isMedium
          ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.13),rgba(255,255,255,0.05)_24%,rgba(255,255,255,0.02)_100%)]'
          : 'bg-slate-950/92',
      panelMuted: isHigh
        ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.06)_22%,rgba(255,255,255,0.02)_100%)]'
        : isMedium
          ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.04)_24%,rgba(255,255,255,0.015)_100%)]'
          : 'bg-slate-950/88',
      border: isHigh ? 'border-white/22' : 'border-white/16',
      borderStrong: isHigh ? 'border-white/28' : 'border-white/18',
      divider: isHigh ? 'divide-white/12' : 'divide-white/10',
      textPrimary: 'text-white',
      textSecondary: isHigh ? 'text-white/88' : 'text-white/84',
      textSubtle: isHigh ? 'text-white/80' : 'text-white/76',
      textMuted: isHigh ? 'text-white/78' : 'text-white/76',
      iconBg: isHigh
        ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.06)_55%,rgba(255,255,255,0.03)_100%)]'
        : 'bg-white/10',
      subtleBg: isHigh
        ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04)_55%,rgba(255,255,255,0.02)_100%)]'
        : 'bg-white/8',
      hoverBg: isHigh ? 'hover:bg-white/16' : 'hover:bg-white/10',
      inputBg: isHigh
        ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.12),rgba(255,255,255,0.04)_55%,rgba(255,255,255,0.02)_100%)]'
        : 'bg-white/8',
      placeholder: 'placeholder-white/58',
      cardShadow: isHigh
        ? 'shadow-[0_32px_84px_-44px_rgba(2,8,20,0.9),0_10px_20px_-16px_rgba(255,255,255,0.1),inset_0_1px_0_rgba(255,255,255,0.24),inset_0_-18px_34px_rgba(255,255,255,0.04)]'
        : isMedium
          ? 'shadow-[0_24px_58px_-38px_rgba(2,8,20,0.82),inset_0_1px_0_rgba(255,255,255,0.16)]'
          : '',
      lightOverlay: isHigh
        ? 'bg-[radial-gradient(circle_at_18%_0%,rgba(255,255,255,0.18),transparent_34%),linear-gradient(180deg,rgba(255,255,255,0.24),rgba(255,255,255,0.08)_14%,rgba(255,255,255,0.02)_40%,transparent_72%)]'
        : isMedium
          ? 'bg-[linear-gradient(180deg,rgba(255,255,255,0.16),rgba(255,255,255,0.05)_18%,transparent_62%)]'
          : 'bg-[linear-gradient(180deg,rgba(255,255,255,0.05),transparent_52%)]',
      dialogBackdrop: isHigh
        ? 'bg-[rgba(2,6,16,0.42)]'
        : isMedium
          ? 'bg-slate-950/70'
          : 'bg-slate-950/78',
      ringOffset: 'ring-offset-slate-950',
    };
  }

  return {
    appBg: 'bg-[#0a0a0a]',
    shellPanel:
      'bg-[linear-gradient(180deg,rgba(39,39,42,0.92),rgba(24,24,27,0.98)_38%,rgba(9,9,11,1)_100%)] border-[rgba(161,161,170,0.18)]',
    panel:
      'bg-[linear-gradient(180deg,rgba(39,39,42,0.94),rgba(24,24,27,0.98)_36%,rgba(9,9,11,1)_100%)]',
    panelMuted:
      'bg-[linear-gradient(180deg,rgba(39,39,42,0.96),rgba(24,24,27,0.98)_44%,rgba(9,9,11,1)_100%)]',
    border: 'border-[rgba(161,161,170,0.18)]',
    borderStrong: 'border-[rgba(161,161,170,0.24)]',
    divider: 'divide-[rgba(161,161,170,0.18)]',
    textPrimary: 'text-white',
    textSecondary: 'text-gray-300',
    textSubtle: 'text-zinc-300',
    textMuted: 'text-zinc-400',
    iconBg: 'bg-zinc-800',
    subtleBg: 'bg-zinc-900/88',
    hoverBg: 'hover:bg-zinc-800/82',
    inputBg: 'bg-zinc-900/92',
    placeholder: 'placeholder-gray-500',
    cardShadow: 'shadow-[0_26px_62px_-36px_rgba(0,0,0,0.78),inset_0_1px_0_rgba(255,255,255,0.04)]',
    lightOverlay: null,
    dialogBackdrop: 'bg-black/50',
    ringOffset: 'ring-offset-gray-900',
  };
}
