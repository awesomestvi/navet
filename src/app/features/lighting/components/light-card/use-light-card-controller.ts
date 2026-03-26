import { useState } from 'react';
import { useHomeAssistant, useI18n } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { useBrightnessPresets } from '../../hooks/use-brightness-presets';
import { useLightMemoryStore } from '../../stores/light-memory-store';
import { buildLightCardControllerState } from './build-light-card-controller-state';
import type { LightCardController, LightCardControllerParams } from './light-card-controller.types';
import { useLightCardDisplay } from './use-light-card-display';
import { useLightCardInteraction } from './use-light-card-interaction';
import { useLightOnStateSync } from './use-light-on-state-sync';
import { useLightPresetActions } from './use-light-preset-actions';
import { useLightRuntimeState } from './use-light-runtime-state';

export function useLightCardController({
  id,
  name,
  room: _room,
  initialState,
  initialBrightness,
  initialTemp,
  size,
  isEditMode,
}: LightCardControllerParams): LightCardController {
  const [isOn, setIsOn] = useState(initialState);
  const [isOpen, setIsOpen] = useState(false);
  const [selectedIcon, setSelectedIcon] = useState('');

  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
  const { t } = useI18n();
  const brightnessPresets = useBrightnessPresets(id);
  const rememberLightState = useLightMemoryStore((state) => state.rememberState);
  const {
    applyBrightnessPresetsToAll,
    setApplyBrightnessPresetsToAll,
    onBrightnessPresetOrderChange,
    onBrightnessPresetValueChange,
  } = useLightPresetActions(id);

  const isHomeAssistantLight = Boolean(connection) && id.startsWith('light.');
  const {
    isSmall,
    padding,
    supportsColorTemperature,
    supportsColorControl,
    minColorTemp,
    maxColorTemp,
    tempOptions,
    IconComponent,
    iconText,
  } = useLightCardDisplay({ selectedIcon, size, liveEntity });

  useLightOnStateSync({ initialState, liveEntity, setIsOn });

  const {
    brightness,
    colorTemp,
    customColor,
    onBrightnessChange,
    onBrightnessCommit,
    onColorChange,
    onCustomColorChange,
    onTempChange,
    onTempCommit,
    selectedColor,
    toggleLightState,
  } = useLightRuntimeState({
    id,
    isHomeAssistantLight,
    isOn,
    setIsOn,
    initialBrightness,
    initialTemp,
    liveEntity,
    minColorTemp,
    maxColorTemp,
    supportsColorTemperature,
    rememberLightState,
  });

  const { cardInteraction, showPresetOverflow, showSettingsButton } = useLightCardInteraction({
    name,
    isOn,
    isEditMode,
    isSmall,
    toggleLightState,
    lightTypeLabel: t('lighting.type.light'),
    setIsOpen,
  });
  return buildLightCardControllerState({
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
    onApplyBrightnessPresetsToAllChange: setApplyBrightnessPresetsToAll,
    onBrightnessChange,
    onBrightnessCommit,
    onBrightnessPresetOrderChange,
    onBrightnessPresetValueChange,
    onColorChange,
    onCustomColorChange,
    onIconChange: (icon) => setSelectedIcon(icon.trim()),
    onOpenChange: setIsOpen,
    onTempChange,
    onTempCommit,
    padding,
    selectedColor,
    selectedIcon,
    showPresetOverflow,
    showSettingsButton,
    supportsColorControl,
    supportsColorTemperature,
    tempOptions,
  });
}
