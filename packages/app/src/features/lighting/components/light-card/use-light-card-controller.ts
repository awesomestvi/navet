import { readNavetLightState } from '@navet/app/core/navet-device-state';
import { useBrightnessPresets } from '@navet/app/features/lighting/hooks/use-brightness-presets';
import { useLightMemoryStore } from '@navet/app/features/lighting/stores/light-memory-store';
import { useProviderEntityModel, useProviderEntitySnapshot } from '@navet/app/hooks';
import { useCardSettingsDialog } from '@navet/app/hooks/use-card-settings-dialog';
import { useIntegrationStore } from '@navet/app/hooks/use-integration-store';
import { hasIntegrationLightFeatureService } from '@navet/app/services/integration-light-feature.service';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { useState } from 'react';
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
  const providerEntity = useProviderEntityModel(id);
  const providerState = readNavetLightState(providerEntity);
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
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const scopedId = parseProviderScopedId(id);
  const resolvedProviderId =
    providerEntity?.providerId ?? providerId ?? scopedId?.providerId ?? currentProviderId;
  const supportsAdvancedLightControls = hasIntegrationLightFeatureService(
    scopedId ? id : `${resolvedProviderId}:${id}`
  );
  const liveEntity = useProviderEntitySnapshot(id);
  const brightnessPresets = useBrightnessPresets(id);
  const rememberLightState = useLightMemoryStore((state) => state.rememberState);
  const {
    applyBrightnessPresetsToAll,
    setApplyBrightnessPresetsToAll,
    onBrightnessPresetOrderChange,
    onBrightnessPresetValueChange,
  } = useLightPresetActions(id);

  const {
    isSmall,
    padding,
    supportsBrightness,
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
    liveEntity,
    initialTemp: resolvedInitialTemp,
    providerState,
    supportsAdvancedLightControls,
  });

  useLightOnStateSync({ initialState: resolvedInitialState, liveEntity, providerState, setIsOn });
  const syncLight = useLightServiceSync({ id });

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
    syncLight,
  });
  const { currentEffect, effectOptions, onEffectSelect, supportsEffects } = useLightEffectSync({
    supportsAdvancedLightControls,
    isOn,
    liveEntity,
    setIsOn,
    syncLight,
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
    supportsBrightness,
    supportsEffects,
    supportsColorControl,
    supportsColorTemperature,
    tempOptions,
  });
}
