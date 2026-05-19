import type { TranslateFn } from '@/app/hooks';

export function getHvacTemperatureStatusLabel(
  t: TranslateFn,
  targetTemp: string | number,
  currentTemp: string | number,
  visualMode?: string,
  comparisonTargetTemp = Number(targetTemp),
  comparisonCurrentTemp = Number(currentTemp)
) {
  if (visualMode === 'cool') {
    return t('climate.coolingDownTo', { temp: targetTemp });
  }

  if (visualMode === 'heat') {
    return t('climate.heatingTo', { temp: targetTemp });
  }

  return comparisonTargetTemp < comparisonCurrentTemp
    ? t('climate.coolingDownTo', { temp: targetTemp })
    : t('climate.heatingTo', { temp: targetTemp });
}
