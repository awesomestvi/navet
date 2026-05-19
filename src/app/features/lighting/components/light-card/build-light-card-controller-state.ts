import type { useEntityCardInteractionController } from '@/app/components/shared/entity-card-interaction-controller';
import type { LightCardController } from './light-card-controller.types';

type BuildLightCardControllerStateParams = Omit<
  LightCardController,
  'colorSwatchColor' | 'currentColor' | 'iconButtonProps' | 'settingsButtonProps'
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
  const resolvedCurrentColor = selectedColor ?? '';
  const resolvedColorSwatchColor = selectedColor ?? customColor;

  return {
    applyBrightnessPresetsToAll,
    brightness,
    brightnessPresets,
    cardInteraction,
    colorTemp,
    colorSwatchColor: resolvedColorSwatchColor,
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
