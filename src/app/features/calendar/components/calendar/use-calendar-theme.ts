import { getCardReadableTextTokens } from '@/app/components/shared/theme/card-readable-text-tokens';
import { type ThemeType, useTheme } from '@/app/hooks';

interface CalendarThemeColors {
  textPrimary: string;
  textSecondary: string;
  overlayBg: string;
  iconBg: string;
  iconColor: string;
  dividerColor: string;
  hoverBg: string;
  hoverText: string;
  dotColor: string;
  moreEventsColor: string;
}

export function useCalendarTheme(theme: ThemeType, baseColor?: string | null): CalendarThemeColors {
  const { accentColor } = useTheme();
  const textTokens = getCardReadableTextTokens({
    theme,
    tone: 'indigo',
    accentColor,
    baseColor,
  });
  const textPrimary = textTokens.titleColor;
  const textSecondary = textTokens.subtitleColor;
  const overlayBg =
    theme === 'light' ? 'bg-white/60 backdrop-blur-sm' : 'bg-black/20 backdrop-blur-sm';
  const iconBg =
    theme === 'light'
      ? 'bg-indigo-100'
      : theme === 'glass'
        ? 'bg-indigo-300/24 border border-indigo-100/20 backdrop-blur-sm'
        : 'bg-white/10 border border-white/14 backdrop-blur-sm';
  const iconColor =
    theme === 'light' ? 'text-indigo-700' : theme === 'glass' ? 'text-indigo-100' : 'text-white';
  const dividerColor = theme === 'light' ? 'bg-gray-200' : 'bg-white/12';
  const hoverBg = theme === 'light' ? 'hover:bg-gray-100/80' : 'hover:bg-white/5';
  const hoverText = '';
  const dotColor = theme === 'light' ? 'text-gray-300' : 'text-white/40';
  const moreEventsColor = theme === 'light' ? 'text-gray-500' : 'text-white/60';

  return {
    textPrimary,
    textSecondary,
    overlayBg,
    iconBg,
    iconColor,
    dividerColor,
    hoverBg,
    hoverText,
    dotColor,
    moreEventsColor,
  };
}
