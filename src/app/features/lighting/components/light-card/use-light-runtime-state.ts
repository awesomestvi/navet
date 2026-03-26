import type { HassEntity } from 'home-assistant-js-websocket';
import { useLightMemoryStore } from '../../stores/light-memory-store';
import { useLightBrightnessSync } from './use-light-brightness-sync';
import { useLightColorSync } from './use-light-color-sync';
import { useLightHomeAssistantSync, useLightServiceSync } from './use-light-home-assistant-sync';

interface UseLightRuntimeStateParams {
  id: string;
  isHomeAssistantLight: boolean;
  isOn: boolean;
  setIsOn: React.Dispatch<React.SetStateAction<boolean>>;
  initialBrightness: number;
  initialTemp: number;
  liveEntity: HassEntity | undefined;
  minColorTemp: number;
  maxColorTemp: number;
  supportsColorTemperature: boolean;
  rememberLightState: (id: string, state: { brightness?: number; colorTemp?: number }) => void;
}

export function useLightRuntimeState({
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
}: UseLightRuntimeStateParams) {
  const syncLightWithHomeAssistant = useLightServiceSync({ id, isHomeAssistantLight });
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
