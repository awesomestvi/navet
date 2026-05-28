import type { NavetLightState } from '@/app/core/navet-device-state';
import { useLightMemoryStore } from '@/app/features/lighting/stores/light-memory-store';
import type { PlatformEntitySnapshot } from '@/app/platform/provider-feature-models';
import { useLightBrightnessSync } from './use-light-brightness-sync';
import { useLightColorSync } from './use-light-color-sync';
import type { LightUpdateOptions } from './use-light-home-assistant-sync';
import { useLightHomeAssistantSync } from './use-light-home-assistant-sync';

interface UseLightRuntimeStateParams {
  id: string;
  isOn: boolean;
  setIsOn: React.Dispatch<React.SetStateAction<boolean>>;
  initialBrightness: number;
  initialTemp: number;
  liveEntity: PlatformEntitySnapshot | undefined;
  providerState: NavetLightState | null | undefined;
  minColorTemp: number;
  maxColorTemp: number;
  supportsColorTemperature: boolean;
  rememberLightState: (id: string, state: { brightness?: number; colorTemp?: number }) => void;
  syncLightWithHomeAssistant: (options: LightUpdateOptions) => Promise<void>;
}

export function useLightRuntimeState({
  id,
  isOn,
  setIsOn,
  initialBrightness,
  initialTemp,
  liveEntity,
  providerState,
  minColorTemp,
  maxColorTemp,
  supportsColorTemperature,
  rememberLightState,
  syncLightWithHomeAssistant,
}: UseLightRuntimeStateParams) {
  const rememberedState = useLightMemoryStore.getState().getRememberedState(id);

  const {
    brightness,
    lastBrightnessRef,
    pendingBrightnessRef,
    brightnessSyncTimeoutRef,
    onBrightnessChange,
    onBrightnessCommit,
  } = useLightBrightnessSync({
    id,
    isOn,
    setIsOn,
    initialBrightness,
    liveEntity,
    providerState,
    syncLight: syncLightWithHomeAssistant,
    rememberLightState,
  });

  const {
    colorTemp,
    selectedColor,
    customColor,
    lastColorTempRef,
    pendingTempRef,
    tempSyncTimeoutRef,
    onTempChange,
    onTempCommit,
    onColorChange,
    onCustomColorChange,
  } = useLightColorSync({
    id,
    isOn,
    setIsOn,
    initialTemp,
    liveEntity,
    providerState,
    minColorTemp,
    maxColorTemp,
    syncLight: syncLightWithHomeAssistant,
    rememberLightState,
    lastBrightnessRef,
    brightness,
    initialColorTemp: rememberedState?.colorTemp ?? Math.round(initialTemp / 100) * 100,
  });

  const { toggleLightState } = useLightHomeAssistantSync({
    id,
    brightness,
    minColorTemp,
    maxColorTemp,
    selectedColor,
    supportsColorTemperature,
    syncLightWithHomeAssistant,
    lastBrightnessRef,
    lastColorTempRef,
    pendingBrightnessRef,
    pendingTempRef,
    brightnessSyncTimeoutRef,
    tempSyncTimeoutRef,
    setIsOn,
  });

  return {
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
  };
}
