import { useCallback } from 'react';
import { toast } from 'sonner';
import { useI18n } from '@/app/hooks';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { useLightMemoryStore } from '../../stores/light-memory-store';
import { clampKelvin, clampPercentage } from './light-card-utils';

interface LightUpdateOptions {
  state?: 'on' | 'off';
  brightnessPct?: number;
  kelvin?: number;
  rgbColor?: [number, number, number];
  hsColor?: [number, number];
  xyColor?: [number, number];
}

interface UseLightServiceSyncParams {
  id: string;
  isHomeAssistantLight: boolean;
}

export function useLightServiceSync({ id, isHomeAssistantLight }: UseLightServiceSyncParams) {
  const { t } = useI18n();

  return useCallback(
    async (options: LightUpdateOptions) => {
      if (!isHomeAssistantLight) return;
      try {
        await homeAssistantService.updateLight(id, options);
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : t('lighting.feedback.updateLightFailed')
        );
        throw error;
      }
    },
    [id, isHomeAssistantLight, t]
  );
}

interface UseLightHomeAssistantSyncParams {
  id: string;
  brightness: number;
  minColorTemp: number;
  maxColorTemp: number;
  selectedColor: string | null;
  supportsColorTemperature: boolean;
  syncLightWithHomeAssistant: (options: LightUpdateOptions) => Promise<void>;
  lastBrightnessRef: React.MutableRefObject<number>;
  lastColorTempRef: React.MutableRefObject<number>;
  pendingBrightnessRef: React.MutableRefObject<number | null>;
  pendingTempRef: React.MutableRefObject<number | null>;
  brightnessSyncTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  tempSyncTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
  setIsOn: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useLightHomeAssistantSync({
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
}: UseLightHomeAssistantSyncParams) {
  const toggleLightState = useCallback(
    (nextIsOn: boolean) => {
      const latestRememberedState = useLightMemoryStore.getState().getRememberedState(id);
      const brightnessToRestore =
        latestRememberedState?.brightness !== undefined
          ? clampPercentage(latestRememberedState.brightness, 1)
          : brightness > 0
            ? brightness
            : Math.max(1, Math.round(lastBrightnessRef.current));
      const colorTempToRestore = clampKelvin(lastColorTempRef.current, minColorTemp, maxColorTemp);
      const rememberedColorTemp =
        latestRememberedState?.colorTemp !== undefined
          ? clampKelvin(latestRememberedState.colorTemp, minColorTemp, maxColorTemp)
          : colorTempToRestore;

      setIsOn(nextIsOn);
      if (nextIsOn) {
        pendingBrightnessRef.current = brightnessToRestore;
        pendingTempRef.current = rememberedColorTemp;
        if (brightnessSyncTimeoutRef.current) clearTimeout(brightnessSyncTimeoutRef.current);
        if (tempSyncTimeoutRef.current) clearTimeout(tempSyncTimeoutRef.current);
        brightnessSyncTimeoutRef.current = setTimeout(() => {
          pendingBrightnessRef.current = null;
          brightnessSyncTimeoutRef.current = null;
        }, 2500);
        tempSyncTimeoutRef.current = setTimeout(() => {
          pendingTempRef.current = null;
          tempSyncTimeoutRef.current = null;
        }, 2500);
      }
      void syncLightWithHomeAssistant({
        state: nextIsOn ? 'on' : 'off',
        brightnessPct: nextIsOn ? brightnessToRestore : undefined,
        kelvin:
          nextIsOn && supportsColorTemperature && !selectedColor ? rememberedColorTemp : undefined,
      }).catch(() => setIsOn(!nextIsOn));
    },
    [
      brightness,
      brightnessSyncTimeoutRef,
      id,
      lastBrightnessRef,
      lastColorTempRef,
      maxColorTemp,
      minColorTemp,
      pendingBrightnessRef,
      pendingTempRef,
      selectedColor,
      setIsOn,
      supportsColorTemperature,
      syncLightWithHomeAssistant,
      tempSyncTimeoutRef,
    ]
  );

  return { toggleLightState };
}
