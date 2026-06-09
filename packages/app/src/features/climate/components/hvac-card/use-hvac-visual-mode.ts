import { useMemo } from 'react';

interface UseHvacVisualModeParams {
  action?: string;
  currentTemp: number;
  isOn: boolean;
  mode: string;
  targetTemp: number;
}

const WATER_HEATER_HEAT_MODES = new Set([
  'eco',
  'electric',
  'gas',
  'heat_pump',
  'high_demand',
  'performance',
]);

export function useHvacVisualMode({
  action,
  currentTemp,
  isOn,
  mode,
  targetTemp,
}: UseHvacVisualModeParams) {
  return useMemo(() => {
    const normalizedAction = action?.toLowerCase() ?? '';
    const normalizedMode = mode.toLowerCase();
    const temperatureDelta = targetTemp - currentTemp;
    const isHeatingMode = normalizedMode === 'heat' || WATER_HEATER_HEAT_MODES.has(normalizedMode);
    const isCoolingMode = normalizedMode === 'cool';
    const isAutoLikeMode = normalizedMode === 'auto' || normalizedMode === 'heat_cool';

    if (!isOn) {
      return 'off';
    }

    if (normalizedAction.includes('fan')) {
      return 'fan';
    }

    if (normalizedMode === 'fan' || normalizedMode === 'fan_only') {
      return 'fan';
    }

    if (isCoolingMode) {
      if (normalizedAction.includes('cool')) {
        return 'cool';
      }

      if (temperatureDelta < -0.05) {
        return 'cool';
      }

      return 'idle';
    }

    if (isHeatingMode) {
      if (normalizedAction.includes('heat')) {
        return 'heat';
      }

      if (WATER_HEATER_HEAT_MODES.has(normalizedMode)) {
        return 'heat';
      }

      if (temperatureDelta > 0.05) {
        return 'heat';
      }

      return 'idle';
    }

    if (temperatureDelta > 0.05) {
      return 'heat';
    }

    if (temperatureDelta < -0.05) {
      return 'cool';
    }

    if (normalizedAction.includes('heat')) {
      return 'heat';
    }

    if (normalizedAction.includes('cool')) {
      return 'cool';
    }

    if (normalizedAction.includes('idle') || isAutoLikeMode) {
      return 'idle';
    }

    return normalizedMode;
  }, [action, currentTemp, isOn, mode, targetTemp]);
}
