import { Moon, Sparkles, Sun } from 'lucide-react';

export const TEMP_OPTIONS = [
  { value: 2200, color: '#FFB366', label: 'Relax' },
  { value: 2700, color: '#FFC98A', label: 'Cozy' },
  { value: 3000, color: '#FFD4A3', label: 'Read' },
  { value: 3500, color: '#FFE7BF', label: 'Neutral' },
  { value: 4300, color: '#FFF4E6', label: 'Concentrate' },
  { value: 5000, color: '#F1F7FF', label: 'Crisp' },
  { value: 5700, color: '#EAF3FF', label: 'Daylight' },
  { value: 6400, color: '#E6F2FF', label: 'Energize' },
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
  { key: 'bright', icon: Sun, defaultBrightness: 100, label: 'Bright' },
  { key: 'dim', icon: Moon, defaultBrightness: 50, label: 'Dim' },
  { key: 'night', icon: Sparkles, defaultBrightness: 25, label: 'Night' },
] as const;

export type BrightnessPresetKey = (typeof BRIGHTNESS_PRESET_DEFINITIONS)[number]['key'];
