import { convertTemperatureUnitValue, type TemperatureUnit } from '@/app/utils/temperature';

export function convertCelsiusPresetToSourceUnit(
  presetCelsius: number,
  sourceTemperatureUnit: TemperatureUnit | undefined
): number {
  return convertTemperatureUnitValue(presetCelsius, 'celsius', sourceTemperatureUnit ?? 'celsius');
}
