import { Sun, SunDim, SunMedium } from 'lucide-react';
import type { TranslationKey } from '../i18n';

export const TEMP_OPTIONS: Array<{ value: number; color: string; labelKey: TranslationKey }> = [
  { value: 2200, color: '#FFB366', labelKey: 'lighting.temperature.relax' },
  { value: 2700, color: '#FFC98A', labelKey: 'lighting.temperature.cozy' },
  { value: 3000, color: '#FFD4A3', labelKey: 'lighting.temperature.read' },
  { value: 3500, color: '#FFE7BF', labelKey: 'lighting.temperature.neutral' },
  { value: 4300, color: '#FFF4E6', labelKey: 'lighting.temperature.concentrate' },
  { value: 5000, color: '#F1F7FF', labelKey: 'lighting.temperature.crisp' },
  { value: 5700, color: '#EAF3FF', labelKey: 'lighting.temperature.daylight' },
  { value: 6400, color: '#E6F2FF', labelKey: 'lighting.temperature.energize' },
];

export const PRESET_COLORS = [
  '#FFA500',
  '#FF6B6B',
  '#4ECDC4',
  '#45B7D1',
  '#96CEB4',
  '#FFEAA7',
  '#DFE6E9',
];

export const BRIGHTNESS_PRESET_DEFINITIONS = [
  { key: 'bright', icon: Sun, defaultBrightness: 100, labelKey: 'lighting.preset.bright' },
  { key: 'dim', icon: SunMedium, defaultBrightness: 50, labelKey: 'lighting.preset.dim' },
  { key: 'night', icon: SunDim, defaultBrightness: 25, labelKey: 'lighting.preset.night' },
] as const;

export type BrightnessPresetKey = (typeof BRIGHTNESS_PRESET_DEFINITIONS)[number]['key'];
