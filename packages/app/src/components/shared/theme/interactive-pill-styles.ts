import { getThemeAppearancePickerTokens } from '@navet/app/components/shared/theme/theme-appearance-picker-tokens';
import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import type { PrimaryColor, ThemeType } from '@navet/app/hooks/use-theme';
import type { CSSProperties } from 'react';

export type InteractivePillIntent = 'navigation' | 'action';
export type InteractivePillVariant = 'default' | 'ghost';

export function getInteractivePillStyles({
  accentColor,
  intent = 'navigation',
  isActive,
  primaryColor,
  theme,
  variant = 'default',
}: {
  accentColor?: string;
  intent?: InteractivePillIntent;
  isActive: boolean;
  primaryColor: PrimaryColor;
  theme: ThemeType;
  variant?: InteractivePillVariant;
}): {
  className: string;
  style?: CSSProperties;
} {
  const accent = accentColor ?? getThemeColorValue(primaryColor);
  const pickerTokens = getThemeAppearancePickerTokens(theme, accent);
  const isGhost = variant === 'ghost';
  const baseClassName = isGhost
    ? `border ${pickerTokens.textClassName} transition-[color,background-color,border-color,box-shadow,opacity,transform,filter]`
    : `border ${pickerTokens.textClassName} ${pickerTokens.optionBorderClassName} transition-[color,background-color,border-color,box-shadow,opacity,transform,filter]`;

  if (!isActive) {
    void intent;
    return {
      className: isGhost
        ? `${baseClassName} border-transparent bg-transparent`
        : `${baseClassName} ${pickerTokens.optionCardClassName}`,
    };
  }

  if (theme === 'light') {
    return {
      className:
        'border text-slate-950 transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] hover:bg-white',
      style: {
        backgroundColor: '#ffffff',
        borderColor: `${accent}80`,
      },
    };
  }

  return {
    className: `border ${pickerTokens.textClassName} ${pickerTokens.optionBorderClassName} transition-[color,background-color,border-color,box-shadow,opacity,transform,filter] shadow-sm`,
    style: pickerTokens.activeOptionStyle,
  };
}
