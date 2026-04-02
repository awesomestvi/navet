import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { PrimaryColor, ThemeType } from '@/app/hooks';

export type SettingsSectionStyles = {
  accentColor: string;
  borderColor: string;
  cardBg: string;
  chipBg: string;
  chipHoverBg: string;
  chipTextColor: string;
  dividerColor: string;
  elevatedShadow: string;
  floatingButtonBg: string;
  floatingButtonText: string;
  hoverBg: string;
  iconBg: string;
  isLightTheme: boolean;
  insetBg: string;
  lineColor: string;
  mixBlendMode: 'multiply' | 'screen';
  mutedColor: string;
  ringClass: string;
  ringOffsetClass: string;
  softBg: string;
  subtleColor: string;
  textColor: string;
};

export function getSettingsSectionStyles(
  theme: ThemeType,
  primaryColor: PrimaryColor
): SettingsSectionStyles {
  const surface = getThemeSurfaceTokens(theme);

  return {
    accentColor: getThemeColorValue(primaryColor),
    borderColor: surface.borderStrong,
    cardBg: surface.panel,
    chipBg: surface.subtleBg,
    chipHoverBg:
      theme === 'light'
        ? 'hover:bg-gray-200'
        : theme === 'black'
          ? 'hover:bg-black'
          : theme === 'glass'
            ? 'hover:bg-white/16'
            : 'hover:bg-white/10',
    chipTextColor: theme === 'light' ? 'text-gray-600' : surface.textSecondary,
    dividerColor: surface.divider,
    elevatedShadow:
      theme === 'light' ? '0 10px 30px rgba(15, 23, 42, 0.06)' : '0 10px 30px rgba(0, 0, 0, 0.18)',
    floatingButtonBg: theme === 'light' ? 'bg-gray-900' : 'bg-white',
    floatingButtonText: theme === 'light' ? 'text-white' : 'text-gray-900',
    hoverBg: theme === 'light' ? 'hover:bg-gray-100/90' : surface.hoverBg,
    iconBg: surface.iconBg,
    isLightTheme: theme === 'light',
    insetBg: surface.panelMuted,
    lineColor: surface.borderStrong,
    mixBlendMode: theme === 'light' ? 'multiply' : 'screen',
    mutedColor: theme === 'light' ? 'text-gray-700' : surface.textSecondary,
    ringClass: theme === 'light' ? 'ring-black/30' : 'ring-white/40',
    ringOffsetClass: theme === 'light' ? 'ring-offset-white' : 'ring-offset-gray-900',
    softBg: surface.panelMuted,
    subtleColor: surface.textMuted,
    textColor: surface.textPrimary,
  };
}
