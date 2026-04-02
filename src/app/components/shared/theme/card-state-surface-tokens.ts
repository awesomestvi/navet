import type { ThemeType } from '@/app/hooks/use-theme';
import { getThemeSurfaceTokens } from './theme-surface-tokens';

export interface CardStateSurfaceTokens {
  containerClassName: string;
  overlayClassName: string | null;
  primaryTextClassName: string;
  secondaryTextClassName: string;
  mutedTextClassName: string;
  artworkClassName: string;
}

export function getCardStateSurfaceTokens(
  theme: ThemeType,
  isActive: boolean
): CardStateSurfaceTokens {
  const surface = getThemeSurfaceTokens(theme);

  if (theme === 'light') {
    return {
      containerClassName: isActive ? '' : 'brightness-[0.98]',
      overlayClassName: null,
      primaryTextClassName: isActive ? surface.textPrimary : 'text-gray-700',
      secondaryTextClassName: isActive ? surface.textSecondary : 'text-gray-500',
      mutedTextClassName: isActive ? surface.textMuted : 'text-gray-400',
      artworkClassName: isActive ? '' : 'brightness-[0.92] saturate-[0.78]',
    };
  }

  if (isActive) {
    return {
      containerClassName: '',
      overlayClassName: null,
      primaryTextClassName: 'card-primary-text',
      secondaryTextClassName: surface.textSecondary,
      mutedTextClassName: 'card-muted-text',
      artworkClassName: '',
    };
  }

  if (theme === 'glass') {
    return {
      containerClassName: 'saturate-[0.82]',
      overlayClassName: 'bg-slate-950/14',
      primaryTextClassName: 'card-primary-text',
      secondaryTextClassName: 'text-white/66',
      mutedTextClassName: 'card-muted-text',
      artworkClassName: 'opacity-68 saturate-[0.74]',
    };
  }

  if (theme === 'black') {
    return {
      containerClassName: '',
      overlayClassName: null,
      primaryTextClassName: 'card-primary-text',
      secondaryTextClassName: 'text-gray-300',
      mutedTextClassName: 'card-muted-text',
      artworkClassName: 'brightness-[0.88] saturate-[0.72]',
    };
  }

  // dark (default)
  return {
    containerClassName: '',
    overlayClassName: null,
    primaryTextClassName: 'card-primary-text',
    secondaryTextClassName: 'text-gray-300',
    mutedTextClassName: 'card-muted-text',
    artworkClassName: 'brightness-[0.88] saturate-[0.72]',
  };
}
