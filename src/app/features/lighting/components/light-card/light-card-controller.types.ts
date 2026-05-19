import type { LucideIcon } from 'lucide-react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import type { BrightnessPresetKey } from '../../stores/light-preset-store';
import type { HeaderIconButtonProps, LightBrightnessPreset } from './light-card-types';

export interface LightCardControllerParams {
  id: string;
  name: string;
  room: string;
  initialState: boolean;
  initialBrightness: number;
  initialTemp: number;
  size: CardSize;
  isEditMode: boolean;
}

export interface LightCardController {
  applyBrightnessPresetsToAll: boolean;
  brightness: number;
  brightnessPresets: LightBrightnessPreset[];
  cardInteraction: ReturnType<typeof useEntityCardInteractionController>;
  colorTemp: number;
  currentColor: string;
  colorSwatchColor: string;
  customColor: string;
  iconButtonProps: HeaderIconButtonProps;
  IconComponent: LucideIcon | null;
  iconText: string | null;
  isOn: boolean;
  isOpen: boolean;
  maxColorTemp: number;
  minColorTemp: number;
  padding: string;
  selectedColor: string | null;
  selectedIcon: string;
  settingsButtonProps: HeaderIconButtonProps;
  showPresetOverflow: boolean;
  showSettingsButton: boolean;
  supportsColorControl: boolean;
  supportsColorTemperature: boolean;
  tempOptions: Array<{ value: number; color: string; label: string }>;
  onApplyBrightnessPresetsToAllChange: (applyToAll: boolean) => void;
  onBrightnessChange: (value: number) => void;
  onBrightnessCommit: (value: number) => void;
  onBrightnessPresetOrderChange: (keys: BrightnessPresetKey[]) => void;
  onBrightnessPresetValueChange: (key: BrightnessPresetKey, value: number) => void;
  onColorChange: (color: string) => void;
  onCustomColorChange: (color: string) => void;
  onIconChange: (icon: string) => void;
  onOpenChange: (open: boolean) => void;
  onTempChange: (temp: number) => void;
  onTempCommit: (temp: number) => void;
  tintColor: string;
  onTintColorChange: (color: string) => void;
}
