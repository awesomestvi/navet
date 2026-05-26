/**
 * Inactive theme tone generator
 * Used for off/disabled states across all domains
 */

import type { ThemeMode as ThemeType } from '@/app/stores/theme-store';

export interface InactiveThemeTone {
  gradient: string;
  border: string;
  iconBg: string;
  accent: string;
  glow: string;
}

export function getInactiveThemeTone(themeType: ThemeType): InactiveThemeTone {
  if (themeType === 'light') {
    return {
      gradient: 'from-gray-100 to-gray-200',
      border: 'border-gray-200',
      iconBg: 'bg-gray-300',
      accent: 'text-gray-500',
      glow: 'transparent',
    };
  }

  return {
    gradient: 'from-zinc-800 to-zinc-900',
    border: 'border-zinc-700',
    iconBg: 'bg-zinc-600',
    accent: 'text-zinc-400',
    glow: 'transparent',
  };
}
