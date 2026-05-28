import type { LucideIcon } from 'lucide-react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import type { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import type { NavetLightState } from '@/app/core/navet-device-state';
import type { BrightnessPresetKey } from '@/app/features/lighting/stores/light-preset-store';
import type { IntegrationProviderId } from '@/app/types/provider';
import type {
  HeaderIconButtonProps,
  LightBrightnessPreset,
  LightEffectOption,
} from './light-card-types';

export interface LightCardControllerParams {
  id: string;
  name: string;
  room: string;
  providerId?: IntegrationProviderId;
  initialState: boolean;
  initialBrightness: number;
  initialTemp: number;
  size: CardSize;
  isEditMode: boolean;
  providerState?: NavetLightState | null;
}

export interface LightCardController {
  applyBrightnessPresetsToAll: boolean;
  brightness: number;
  brightnessPresets: LightBrightnessPreset[];
  cardInteraction: ReturnType<typeof useEntityCardInteractionController>;
  colorTemp: number;
  currentColor: string;
  currentEffect: string | null;
  colorSwatchColor: string;
  customColor: string;
  effectOptions: LightEffectOption[];
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
  supportsEffects: boolean;
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
  onEffectSelect: (effect: string) => void;
  onIconChange: (icon: string) => void;
  onOpenChange: (open: boolean) => void;
  onTempChange: (temp: number) => void;
  onTempCommit: (temp: number) => void;
  tintColor: string;
  onTintColorChange: (color: string) => void;
}
