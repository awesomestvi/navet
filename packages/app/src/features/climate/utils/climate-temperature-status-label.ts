import type { TranslateFn } from '@navet/app/hooks';

export function getClimateTemperatureStatusLabel(
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

  if (visualMode === 'idle') {
    return t('climate.idle');
  }

  if (visualMode === 'off') {
    return t('common.off');
  }

  return comparisonTargetTemp < comparisonCurrentTemp
    ? t('climate.coolingDownTo', { temp: targetTemp })
    : t('climate.heatingTo', { temp: targetTemp });
}
