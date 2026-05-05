import type { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import type { LightCardController } from './light-card-controller.types';

const DEFAULT_LIGHT_CUSTOM_COLOR = '#FFA500';

type BuildLightCardControllerStateParams = Omit<
  LightCardController,
  'currentColor' | 'iconButtonProps' | 'settingsButtonProps'
> & {
  cardInteraction: ReturnType<typeof useEntityCardInteractionController>;
};

export function buildLightCardControllerState({
  applyBrightnessPresetsToAll,
  brightness,
  brightnessPresets,
  cardInteraction,
  colorTemp,
  customColor,
  IconComponent,
  iconText,
  isOn,
  isOpen,
  maxColorTemp,
  minColorTemp,
  onApplyBrightnessPresetsToAllChange,
  onBrightnessChange,
  onBrightnessCommit,
  onBrightnessPresetOrderChange,
  onBrightnessPresetValueChange,
  onColorChange,
  onCustomColorChange,
  onIconChange,
  onOpenChange,
  onTempChange,
  onTempCommit,
  onTintColorChange,
  padding,
  selectedColor,
  selectedIcon,
  showPresetOverflow,
  showSettingsButton,
  supportsColorControl,
  supportsColorTemperature,
  tempOptions,
  tintColor,
}: BuildLightCardControllerStateParams): LightCardController {
  const resolvedCurrentColor =
    selectedColor ?? (customColor !== DEFAULT_LIGHT_CUSTOM_COLOR ? customColor : '');

  return {
    applyBrightnessPresetsToAll,
    brightness,
    brightnessPresets,
    cardInteraction,
    colorTemp,
    currentColor: resolvedCurrentColor,
    customColor,
    iconButtonProps: cardInteraction.iconButtonProps,
    IconComponent,
    iconText,
    isOn,
    isOpen,
    maxColorTemp,
    minColorTemp,
    onApplyBrightnessPresetsToAllChange,
    onBrightnessChange,
    onBrightnessCommit,
    onBrightnessPresetOrderChange,
    onBrightnessPresetValueChange,
    onColorChange,
    onCustomColorChange,
    onIconChange,
    onOpenChange,
    onTempChange,
    onTempCommit,
    onTintColorChange,
    padding,
    selectedColor,
    selectedIcon,
    settingsButtonProps: cardInteraction.settingsButtonProps,
    showPresetOverflow,
    showSettingsButton,
    supportsColorControl,
    supportsColorTemperature,
    tempOptions,
    tintColor,
  };
}
