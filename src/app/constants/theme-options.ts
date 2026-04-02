import type { PrimaryColor, ThemeType } from '../hooks/use-theme';
import type { TranslationKey } from '../i18n';

export type ThemeOption = {
  value: ThemeType;
  labelKey: TranslationKey;
  descriptionKey: TranslationKey;
};

export type PrimaryColorOption = {
  value: PrimaryColor;
  label: string;
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
  { value: 'orange', label: 'Orange', color: '#f97316' },
  { value: 'blue', label: 'Blue', color: '#3b82f6' },
  { value: 'green', label: 'Green', color: '#22c55e' },
  { value: 'purple', label: 'Purple', color: '#a855f7' },
  { value: 'pink', label: 'Pink', color: '#ec4899' },
  { value: 'red', label: 'Red', color: '#ef4444' },
  { value: 'yellow', label: 'Yellow', color: '#eab308' },
  { value: 'teal', label: 'Teal', color: '#14b8a6' },
  { value: 'custom', label: 'Custom', color: '#111827' },
];
