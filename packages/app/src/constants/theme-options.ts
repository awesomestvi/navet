import type { PrimaryColor, ThemeType } from '../hooks/use-theme';
import type { TranslationKey } from '../i18n';

export type ThemeOption = {
  value: ThemeType;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
};

export type PrimaryColorOption = {
  value: PrimaryColor;
  labelKey: TranslationKey;
  color: string;
};

export const THEME_OPTIONS: ThemeOption[] = [
  {
    value: 'glass',
    labelKey: 'themeOption.glass.label',
    descriptionKey: 'themeOption.glass.description',
  },
  {
    value: 'dark',
    labelKey: 'themeOption.dark.label',
    descriptionKey: 'themeOption.dark.description',
  },
  {
    value: 'light',
    labelKey: 'themeOption.light.label',
    descriptionKey: 'themeOption.light.description',
  },
  {
    value: 'black',
    labelKey: 'themeOption.black.label',
    descriptionKey: 'themeOption.black.description',
  },
];

export const PRIMARY_COLOR_OPTIONS: PrimaryColorOption[] = [
  { value: 'orange', labelKey: 'themeColor.orange', color: '#f97316' },
  { value: 'blue', labelKey: 'themeColor.blue', color: '#3b82f6' },
  { value: 'green', labelKey: 'themeColor.green', color: '#22c55e' },
  { value: 'purple', labelKey: 'themeColor.purple', color: '#a855f7' },
  { value: 'pink', labelKey: 'themeColor.pink', color: '#ec4899' },
  { value: 'red', labelKey: 'themeColor.red', color: '#ef4444' },
  { value: 'yellow', labelKey: 'themeColor.yellow', color: '#eab308' },
  { value: 'teal', labelKey: 'themeColor.teal', color: '#14b8a6' },
  { value: 'custom', labelKey: 'themeColor.custom', color: '#111827' },
];
