import { useState } from 'react';
import { useBrightnessPresets } from '@/app/features/lighting/hooks/use-brightness-presets';
import { useLightMemoryStore } from '@/app/features/lighting/stores/light-memory-store';
import { useHomeAssistant } from '@/app/hooks';
import { useCardSettingsDialog } from '@/app/hooks/use-card-settings-dialog';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { buildLightCardControllerState } from './build-light-card-controller-state';
import type { LightCardController, LightCardControllerParams } from './light-card-controller.types';
import { useLightCardDisplay } from './use-light-card-display';
import { useLightCardInteraction } from './use-light-card-interaction';
import { useLightEffectSync } from './use-light-effect-sync';
import { useLightServiceSync } from './use-light-home-assistant-sync';
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
  const { isOpen, onOpen, onClose } = useCardSettingsDialog();
  const [selectedIcon, setSelectedIcon] = useState('');
  const [tintColor, setTintColor] = useState('');

  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const liveEntity = useHomeAssistant(homeAssistantSelectors.entity(id));
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
  const syncLightWithHomeAssistant = useLightServiceSync({ id, isHomeAssistantLight });

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
    isOn,
    setIsOn,
    initialBrightness,
    initialTemp,
    liveEntity,
    minColorTemp,
    maxColorTemp,
    supportsColorTemperature,
    rememberLightState,
    syncLightWithHomeAssistant,
  });
  const { currentEffect, effectOptions, onEffectSelect, supportsEffects } = useLightEffectSync({
    isHomeAssistantLight,
    isOn,
    liveEntity,
    setIsOn,
    syncLight: syncLightWithHomeAssistant,
  });

  const { cardInteraction, showPresetOverflow, showSettingsButton } = useLightCardInteraction({
    name,
    isOn,
    isEditMode,
    isSmall,
    toggleLightState,
    setIsOpen: isOpen ? onClose : onOpen,
  });
  return buildLightCardControllerState({
    applyBrightnessPresetsToAll,
    brightness,
    brightnessPresets,
    cardInteraction,
    colorTemp,
    customColor,
    currentEffect,
    effectOptions,
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
    onEffectSelect,
    onIconChange: (icon) => setSelectedIcon(icon.trim()),
    onOpenChange: isOpen ? onClose : onOpen,
    onTempChange,
    onTempCommit,
    onTintColorChange: setTintColor,
    padding,
    tintColor,
    selectedColor,
    selectedIcon,
    showPresetOverflow,
    showSettingsButton,
    supportsEffects,
    supportsColorControl,
    supportsColorTemperature,
    tempOptions,
  });
}
