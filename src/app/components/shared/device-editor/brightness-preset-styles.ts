import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import type { PrimaryColor, ThemeType } from '@/app/hooks/use-theme';

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

  return {
    backgroundColor:
      isOn && theme === 'glass' ? `${activeColor}26` : isOn ? activeColor : neutralSelectedBg,
    borderColor: 'transparent',
    boxShadow: isOn
      ? `0 10px 24px -18px ${
          theme === 'glass'
            ? `${activeColor}aa`
            : theme === 'light'
              ? `${activeColor}88`
              : `${activeColor}cc`
        }`
      : `0 10px 24px -18px ${neutralSelectedRing}`,
  };
}
