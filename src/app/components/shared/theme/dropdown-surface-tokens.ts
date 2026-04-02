import type { ThemeType } from '@/app/hooks/use-theme';
import type { EffectsQuality } from '@/app/stores/settings-store';

const getCurrentEffectsQuality = (): EffectsQuality => {
  if (typeof document === 'undefined') {
    return 'high';
  }

  const value = document.documentElement.dataset.effectsQuality;
  return value === 'medium' || value === 'low' ? value : 'high';
};

export function getThemeDropdownSurfaceClasses(
  theme: ThemeType,
  effectsQuality: EffectsQuality = getCurrentEffectsQuality()
) {
  if (theme === 'light') {
    return 'rounded-2xl border border-gray-200/80 bg-white text-gray-900';
  }

  if (theme === 'black') {
    return 'rounded-2xl border border-white/16 bg-black text-white';
  }

  if (theme === 'glass') {
    return effectsQuality === 'high'
      ? 'rounded-2xl border border-white/16 bg-[linear-gradient(180deg,rgba(255,255,255,0.14),rgba(255,255,255,0.05))] text-white shadow-[0_24px_56px_-32px_rgba(3,10,24,0.78),inset_0_1px_0_rgba(255,255,255,0.14)]'
      : effectsQuality === 'medium'
        ? 'rounded-2xl border border-white/12 bg-[linear-gradient(180deg,rgba(255,255,255,0.10),rgba(255,255,255,0.03))] text-white shadow-[0_18px_40px_-30px_rgba(3,10,24,0.68),inset_0_1px_0_rgba(255,255,255,0.10)]'
        : 'rounded-2xl border border-white/10 bg-slate-950/94 text-white';
  }

  return 'rounded-2xl border border-white/10 bg-[#141518] text-white';
}
