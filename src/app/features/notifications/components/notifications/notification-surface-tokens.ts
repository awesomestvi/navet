import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { ThemeType } from '@/app/hooks';

interface NotificationSurfaceTokens {
  panelClassName: string;
  borderClassName: string;
  dividerClassName: string;
  hoverClassName: string;
  unreadItemClassName: string;
  emptyStateIconBgClassName: string;
  textPrimary: string;
  textSecondary: string;
  textMuted: string;
}

export function getNotificationSurfaceTokens(theme: ThemeType): NotificationSurfaceTokens {
  const surface = getThemeSurfaceTokens(theme);
  const blurClassName =
    theme === 'glass' ? 'backdrop-blur-xl' : theme === 'light' ? 'backdrop-blur-xl' : '';

  return {
    panelClassName: `${surface.panel} ${blurClassName} border ${surface.border} rounded-2xl shadow-2xl`,
    borderClassName:
      theme === 'light'
        ? 'border-gray-200'
        : theme === 'black'
          ? 'border-white/20'
          : 'border-white/10',
    dividerClassName: theme === 'light' ? 'divide-gray-200' : 'divide-white/5',
    hoverClassName:
      theme === 'light'
        ? 'hover:bg-gray-50'
        : theme === 'black'
          ? 'hover:bg-white/10'
          : 'hover:bg-white/5',
    unreadItemClassName:
      theme === 'light' ? 'bg-gray-50' : theme === 'black' ? 'bg-black/30' : 'bg-white/5',
    emptyStateIconBgClassName:
      theme === 'light' ? 'bg-gray-50' : theme === 'black' ? 'bg-black/30' : 'bg-white/5',
    textPrimary: surface.textPrimary,
    textSecondary: surface.textSecondary,
    textMuted: surface.textSubtle,
  };
}
