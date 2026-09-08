export type TemperatureUnit = 'celsius' | 'fahrenheit';

export function normalizeTemperatureUnit(value: unknown): TemperatureUnit | undefined {
  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();

  if (normalized === '°f' || normalized === 'f' || normalized === 'fahrenheit') {
    return 'fahrenheit';
  }

  if (normalized === '°c' || normalized === 'c' || normalized === 'celsius') {
    return 'celsius';
  }

  return undefined;
}
