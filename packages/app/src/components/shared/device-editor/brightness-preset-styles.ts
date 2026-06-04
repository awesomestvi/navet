import { getThemeColorValue } from '@navet/app/components/shared/theme/theme-colors';
import type { PrimaryColor, ThemeType } from '@navet/app/hooks/use-theme';

export function getBrightnessPresetAccentColor(primaryColor: PrimaryColor) {
  return getThemeColorValue(primaryColor);
}

export function getBrightnessPresetSelectedStyle(
  theme: ThemeType,
  activeColor: string,
  isOn: boolean
) {
  const neutralSelectedBg = theme === 'light' ? '#9ca3af' : 'rgba(255,255,255,0.22)';
  const neutralSelectedRing = theme === 'light' ? '#d1d5db' : 'rgba(255,255,255,0.16)';
  const selectedBackgroundColor =
    theme === 'black'
      ? isOn
        ? activeColor
        : 'rgba(255,255,255,0.16)'
      : isOn && theme === 'glass'
        ? `${activeColor}40`
        : isOn
          ? activeColor
          : neutralSelectedBg;

  return {
    backgroundColor: selectedBackgroundColor,
    borderColor: 'transparent',
    boxShadow: isOn
      ? theme === 'black'
        ? 'none'
        : `0 10px 24px -18px ${
            theme === 'glass'
              ? `${activeColor}aa`
              : theme === 'light'
                ? `${activeColor}88`
                : `${activeColor}cc`
          }`
      : `0 10px 24px -18px ${neutralSelectedRing}`,
  };
}
