import type { HassEntity } from 'home-assistant-js-websocket';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import { useHaCommandQueue } from '@/app/hooks';
import {
  clampKelvin,
  getReportedColorHex,
  getReportedColorTempKelvin,
  hexToRgb,
  rgbToHs,
  rgbToXy,
  roundKelvin,
} from './light-card-utils';

type SyncLightOptions = {
  state?: 'on' | 'off';
  brightnessPct?: number;
  kelvin?: number;
  rgbColor?: [number, number, number];
  hsColor?: [number, number];
  xyColor?: [number, number];
};

interface UseLightColorSyncParams {
  id: string;
  isOn: boolean;
  setIsOn: (on: boolean) => void;
  initialTemp: number;
  liveEntity: HassEntity | undefined;
  minColorTemp: number;
  maxColorTemp: number;
  syncLight: (options: SyncLightOptions) => Promise<void>;
  rememberLightState: (id: string, state: { colorTemp?: number }) => void;
  lastBrightnessRef: RefObject<number>;
  brightness: number;
  initialColorTemp: number;
}

export function useLightColorSync({
  id,
  isOn,
  setIsOn,
  initialTemp,
  liveEntity,
  minColorTemp,
  maxColorTemp,
  syncLight,
  rememberLightState,
  lastBrightnessRef,
  brightness,
  initialColorTemp,
}: UseLightColorSyncParams) {
  const [colorTemp, setColorTemp] = useState(roundKelvin(initialTemp));
  const [isAdjustingTemp, setIsAdjustingTemp] = useState(false);
  const [selectedColor, setSelectedColor] = useState<string | null>(null);
  const [customColor, setCustomColor] = useState('#FFA500');
  const lastColorTempRef = useRef(initialColorTemp);
  const lastKnownColorRef = useRef<string | null>(null);
  const pendingTempRef = useRef<number | null>(null);
  const tempSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (liveEntity) {
      if (isAdjustingTemp) return;
      const entityTemp = getReportedColorTempKelvin(liveEntity);
      if (entityTemp === null) return;
      if (liveEntity.state !== 'on') {
        const nextTemp = clampKelvin(entityTemp, minColorTemp, maxColorTemp);
        lastColorTempRef.current = nextTemp;
        rememberLightState(id, { colorTemp: nextTemp });
        return;
      }
      if (pendingTempRef.current !== null && Math.abs(entityTemp - pendingTempRef.current) > 100) {
        return;
      }
      if (pendingTempRef.current !== null) {
        pendingTempRef.current = null;
        if (tempSyncTimeoutRef.current) {
          clearTimeout(tempSyncTimeoutRef.current);
          tempSyncTimeoutRef.current = null;
        }
      }
      const nextTemp = clampKelvin(entityTemp, minColorTemp, maxColorTemp);
      lastColorTempRef.current = nextTemp;
      rememberLightState(id, { colorTemp: nextTemp });
      setColorTemp(nextTemp);
      return;
    }
    if (isAdjustingTemp) return;
    if (pendingTempRef.current !== null && Math.abs(initialTemp - pendingTempRef.current) > 100) {
      return;
    }
    if (pendingTempRef.current !== null) {
      pendingTempRef.current = null;
      if (tempSyncTimeoutRef.current) {
        clearTimeout(tempSyncTimeoutRef.current);
        tempSyncTimeoutRef.current = null;
      }
    }
    const nextTemp = roundKelvin(initialTemp);
    lastColorTempRef.current = nextTemp;
    rememberLightState(id, { colorTemp: nextTemp });
    setColorTemp(nextTemp);
  }, [
    id,
    initialTemp,
    isAdjustingTemp,
    liveEntity,
    maxColorTemp,
    minColorTemp,
    rememberLightState,
  ]);

  useEffect(() => {
    if (!liveEntity || liveEntity.state !== 'on' || isAdjustingTemp) return;
    const reportedColor = getReportedColorHex(liveEntity);
    if (reportedColor) {
      setSelectedColor(reportedColor);
      lastKnownColorRef.current = reportedColor;
      setCustomColor(reportedColor);
    } else {
      setSelectedColor(null);
    }
  }, [isAdjustingTemp, liveEntity]);

  useEffect(() => {
    return () => {
      if (tempSyncTimeoutRef.current) clearTimeout(tempSyncTimeoutRef.current);
    };
  }, []);

  const { queue: queueTempSync, cancel: cancelTempSync } = useHaCommandQueue((kelvin: number) =>
    syncLight({ state: 'on', kelvin })
  );

  const onTempChange = useCallback(
    (temp: number) => {
      const nextTemp = clampKelvin(temp, minColorTemp, maxColorTemp);
      setIsAdjustingTemp(true);
      setColorTemp(nextTemp);
      lastColorTempRef.current = nextTemp;
      rememberLightState(id, { colorTemp: nextTemp });
      setSelectedColor(null);
      lastKnownColorRef.current = null;
      if (!isOn) setIsOn(true);
      queueTempSync(nextTemp);
    },
    [id, isOn, maxColorTemp, minColorTemp, queueTempSync, rememberLightState, setIsOn]
  );

  const onTempCommit = useCallback(
    (temp: number) => {
      const nextTemp = clampKelvin(temp, minColorTemp, maxColorTemp);
      setColorTemp(nextTemp);
      lastColorTempRef.current = nextTemp;
      rememberLightState(id, { colorTemp: nextTemp });
      setIsAdjustingTemp(false);
      pendingTempRef.current = nextTemp;
      if (tempSyncTimeoutRef.current) clearTimeout(tempSyncTimeoutRef.current);
      tempSyncTimeoutRef.current = setTimeout(() => {
        pendingTempRef.current = null;
        tempSyncTimeoutRef.current = null;
      }, 1500);
      setSelectedColor(null);
      lastKnownColorRef.current = null;
      if (!isOn) setIsOn(true);
      queueTempSync(nextTemp, true);
    },
    [id, isOn, maxColorTemp, minColorTemp, queueTempSync, rememberLightState, setIsOn]
  );

  const onColorChange = useCallback(
    (color: string) => {
      cancelTempSync();
      setSelectedColor(color);
      lastKnownColorRef.current = color;
      if (!isOn) setIsOn(true);

      const rgbColor = hexToRgb(color);
      if (rgbColor) {
        const hsColor = rgbToHs(rgbColor);
        const xyColor = rgbToXy(rgbColor);
        const supportedModes = Array.isArray(liveEntity?.attributes?.supported_color_modes)
          ? liveEntity.attributes.supported_color_modes.filter(
              (mode): mode is string => typeof mode === 'string'
            )
          : typeof liveEntity?.attributes?.color_mode === 'string'
            ? [liveEntity.attributes.color_mode]
            : [];
        const activeMode =
          typeof liveEntity?.attributes?.color_mode === 'string'
            ? liveEntity.attributes.color_mode
            : null;
        const supportsRgb = supportedModes.some((mode) => ['rgb', 'rgbw', 'rgbww'].includes(mode));
        const supportsHs = supportedModes.includes('hs');
        const supportsXy = supportedModes.includes('xy');
        const preferredColorPayload: {
          rgbColor?: [number, number, number];
          hsColor?: [number, number];
          xyColor?: [number, number];
        } =
          activeMode === 'xy' && supportsXy
            ? { xyColor }
            : activeMode === 'hs' && supportsHs
              ? { hsColor }
              : ['rgb', 'rgbw', 'rgbww'].includes(activeMode ?? '') && supportsRgb
                ? { rgbColor }
                : supportsXy
                  ? { xyColor }
                  : supportsHs
                    ? { hsColor }
                    : { rgbColor };

        const turnOnBrightness = !isOn
          ? Math.max(1, Math.round(lastBrightnessRef.current || brightness || 100))
          : undefined;

        void syncLight({ state: 'on', brightnessPct: turnOnBrightness, ...preferredColorPayload });
      }
    },
    [brightness, cancelTempSync, isOn, lastBrightnessRef, liveEntity, setIsOn, syncLight]
  );

  const onCustomColorChange = useCallback(
    (color: string) => {
      setCustomColor(color);
      onColorChange(color);
    },
    [onColorChange]
  );

  return {
    colorTemp,
    isAdjustingTemp,
    selectedColor,
    customColor,
    lastColorTempRef,
    pendingTempRef,
    tempSyncTimeoutRef,
    onTempChange,
    onTempCommit,
    onColorChange,
    onCustomColorChange,
  };
}
