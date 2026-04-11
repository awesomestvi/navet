import type { TranslateFn } from '@/app/hooks';

export function getHvacTemperatureStatusLabel(
  t: TranslateFn,
  targetTemp: number,
  currentTemp: number
) {
  return targetTemp < currentTemp
    ? t('climate.coolingDownTo', { temp: targetTemp })
    : t('climate.heatingTo', { temp: targetTemp });
}
