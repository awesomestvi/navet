import type { NavetLightState } from '@navet/app/core/navet-device-state';
import { useHaCommandQueue } from '@navet/app/hooks';
import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import { type RefObject, useCallback, useEffect, useRef, useState } from 'react';
import {
  clampKelvin,
  getReportedColorHex,
  getReportedColorTempKelvin,
  hexToRgb,
  rgbToHs,
  rgbToXy,
  roundKelvin,
} from './light-card-utils';
import { usePendingLightValue } from './use-pending-light-value';

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
  liveEntity: PlatformEntitySnapshot | undefined;
  providerState: NavetLightState | null | undefined;
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
  providerState,
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
  const pendingTemp = usePendingLightValue(100);

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
      if (!pendingTemp.accept(entityTemp)) return;
      const nextTemp = clampKelvin(entityTemp, minColorTemp, maxColorTemp);
      lastColorTempRef.current = nextTemp;
      rememberLightState(id, { colorTemp: nextTemp });
      setColorTemp(nextTemp);
      return;
    }
    const providerTemp =
      typeof providerState?.colorTemperatureKelvin === 'number'
        ? providerState.colorTemperatureKelvin
        : initialTemp;
    if (isAdjustingTemp) return;
    if (!pendingTemp.accept(providerTemp)) return;
    const nextTemp = roundKelvin(providerTemp);
    lastColorTempRef.current = nextTemp;
    rememberLightState(id, { colorTemp: nextTemp });
    setColorTemp(nextTemp);
  }, [
    id,
    initialTemp,
    pendingTemp,
    isAdjustingTemp,
    liveEntity,
    maxColorTemp,
    minColorTemp,
    providerState?.colorTemperatureKelvin,
    rememberLightState,
  ]);

  useEffect(() => {
    if (liveEntity?.state !== 'on' || isAdjustingTemp) return;
    const reportedColor = getReportedColorHex(liveEntity);
    if (reportedColor) {
      setSelectedColor(reportedColor);
      lastKnownColorRef.current = reportedColor;
      setCustomColor(reportedColor);
    } else {
      setSelectedColor(null);
    }
  }, [isAdjustingTemp, liveEntity]);

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
    [id, isOn, maxColorTemp, minColorTemp, pendingTemp, queueTempSync, rememberLightState, setIsOn]
  );

  const onTempCommit = useCallback(
    (temp: number) => {
      const nextTemp = clampKelvin(temp, minColorTemp, maxColorTemp);
      setColorTemp(nextTemp);
      lastColorTempRef.current = nextTemp;
      rememberLightState(id, { colorTemp: nextTemp });
      setIsAdjustingTemp(false);
      pendingTemp.expect(nextTemp);
      setSelectedColor(null);
      lastKnownColorRef.current = null;
      if (!isOn) setIsOn(true);
      queueTempSync(nextTemp, true);
    },
    [id, isOn, maxColorTemp, minColorTemp, pendingTemp, queueTempSync, rememberLightState, setIsOn]
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
    expectTemp: pendingTemp.expect,
    onTempChange,
    onTempCommit,
    onColorChange,
    onCustomColorChange,
  };
}
