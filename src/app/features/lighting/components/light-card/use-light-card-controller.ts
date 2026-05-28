import { useState } from 'react';
import { readNavetLightState } from '@/app/core/navet-device-state';
import { useBrightnessPresets } from '@/app/features/lighting/hooks/use-brightness-presets';
import { useLightMemoryStore } from '@/app/features/lighting/stores/light-memory-store';
import {
  useProviderConnectionState,
  useProviderDevice,
  useProviderEntitySnapshot,
} from '@/app/hooks';
import { useCardSettingsDialog } from '@/app/hooks/use-card-settings-dialog';
import { isLegacyHomeAssistantEntityId } from '@/app/utils/provider-entity-id';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
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
  providerId,
  initialState,
  initialBrightness,
  initialTemp,
  size,
  isEditMode,
}: LightCardControllerParams): LightCardController {
  const providerDevice = useProviderDevice(id);
  const providerState = readNavetLightState(providerDevice);
  const resolvedInitialState =
    providerState?.value === 'on' ? true : providerState?.value === 'off' ? false : initialState;
  const resolvedInitialBrightness =
    typeof providerState?.brightnessPct === 'number'
      ? providerState.brightnessPct
      : initialBrightness;
  const resolvedInitialTemp =
    typeof providerState?.colorTemperatureKelvin === 'number'
      ? providerState.colorTemperatureKelvin
      : initialTemp;
  const [isOn, setIsOn] = useState(resolvedInitialState);
  const { isOpen, onOpen, onClose } = useCardSettingsDialog();
  const [selectedIcon, setSelectedIcon] = useState('');
  const [tintColor, setTintColor] = useState('');
  const scopedId = parseProviderScopedId(id);
  const nativeId = scopedId?.nativeId ?? id;
  const resolvedProviderId =
    providerDevice?.providerId ??
    providerId ??
    (isLegacyHomeAssistantEntityId(nativeId) ? 'home_assistant' : undefined);
  const isHomeAssistantProvider = resolvedProviderId === 'home_assistant';

  const isProviderConnected = useProviderConnectionState(resolvedProviderId);
  const liveEntity = useProviderEntitySnapshot(id);
  const brightnessPresets = useBrightnessPresets(id);
  const rememberLightState = useLightMemoryStore((state) => state.rememberState);
  const {
    applyBrightnessPresetsToAll,
    setApplyBrightnessPresetsToAll,
    onBrightnessPresetOrderChange,
    onBrightnessPresetValueChange,
  } = useLightPresetActions(id);

  const isHomeAssistantLight =
    isHomeAssistantProvider && isProviderConnected && nativeId.startsWith('light.');
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
  } = useLightCardDisplay({
    selectedIcon,
    size,
    providerId,
    liveEntity,
    initialTemp: resolvedInitialTemp,
    providerState,
  });

  useLightOnStateSync({ initialState: resolvedInitialState, liveEntity, providerState, setIsOn });
  const syncLightWithHomeAssistant = useLightServiceSync({ id, providerId, isHomeAssistantLight });

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
    initialBrightness: resolvedInitialBrightness,
    initialTemp: resolvedInitialTemp,
    liveEntity,
    providerState,
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
