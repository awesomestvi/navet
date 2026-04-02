import type { CSSProperties } from 'react';
import { getThemeAppearancePickerTokens } from '@/app/components/shared/theme/theme-appearance-picker-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';

export type InteractivePillIntent = 'navigation' | 'action';

export function getInteractivePillStyles({
  intent = 'navigation',
  isActive,
  primaryColor,
  theme,
}: {
  intent?: InteractivePillIntent;
  isActive: boolean;
  primaryColor: PrimaryColor;
  theme: ThemeType;
}): {
  className: string;
  style?: CSSProperties;
} {
  const accent = getThemeColorValue(primaryColor);
  const pickerTokens = getThemeAppearancePickerTokens(theme, accent);
  const baseClassName = `border ${pickerTokens.textClassName} ${pickerTokens.optionBorderClassName} transition-all`;

  if (!isActive) {
    void intent;
    return {
      className: `${baseClassName} ${pickerTokens.optionCardClassName}`,
    };
  }

  return {
    className: `${baseClassName} shadow-sm`,
    style: pickerTokens.activeOptionStyle,
  };
}
