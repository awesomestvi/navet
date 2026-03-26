import { useMemo } from 'react';

interface UseHvacVisualModeParams {
  action?: string;
  currentTemp: number;
  isOn: boolean;
  mode: string;
  targetTemp: number;
}

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

    if (!isOn) {
      return 'off';
    }

    if (normalizedAction.includes('fan')) {
      return 'fan';
    }

    if (normalizedAction.includes('heat')) {
      return 'heat';
    }

    if (normalizedAction.includes('cool')) {
      return 'cool';
    }

    if (normalizedMode === 'fan' || normalizedMode === 'fan_only') {
      return 'fan';
    }

    if (temperatureDelta > 0.05) {
      return 'heat';
    }

    if (temperatureDelta < -0.05) {
      return 'cool';
    }

    if (normalizedMode === 'heat') {
      return 'heat';
    }

    if (normalizedMode === 'cool') {
      return 'cool';
    }

    return normalizedMode;
  }, [action, currentTemp, isOn, mode, targetTemp]);
}
