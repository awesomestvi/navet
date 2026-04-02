import type { CSSProperties } from 'react';
import { getThemeAppearancePickerTokens } from '@/app/components/shared/theme/theme-appearance-picker-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';

export type InteractivePillIntent = 'navigation' | 'action';
export type InteractivePillVariant = 'default' | 'ghost';

export function getInteractivePillStyles({
  intent = 'navigation',
  isActive,
  primaryColor,
  theme,
  variant = 'default',
}: {
  intent?: InteractivePillIntent;
  isActive: boolean;
  primaryColor: PrimaryColor;
  theme: ThemeType;
  variant?: InteractivePillVariant;
}): {
  className: string;
  style?: CSSProperties;
} {
  const accent = getThemeColorValue(primaryColor);
  const pickerTokens = getThemeAppearancePickerTokens(theme, accent);
  const isGhost = variant === 'ghost';
  const baseClassName = isGhost
    ? `${pickerTokens.textClassName} transition-all`
    : `border ${pickerTokens.textClassName} ${pickerTokens.optionBorderClassName} transition-all`;

  if (!isActive) {
    void intent;
    return {
      className: isGhost
        ? `${baseClassName} border-transparent bg-transparent`
        : `${baseClassName} ${pickerTokens.optionCardClassName}`,
    };
  }

  return {
    className: `border ${pickerTokens.textClassName} ${pickerTokens.optionBorderClassName} transition-all shadow-sm`,
    style: pickerTokens.activeOptionStyle,
  };
}
