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

export function getTemperatureUnitSymbol(unit: TemperatureUnit): '°C' | '°F' {
  return unit === 'fahrenheit' ? '°F' : '°C';
}

export function convertCelsiusToTemperatureUnit(value: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? (value * 9) / 5 + 32 : value;
}

export function convertTemperatureUnitToCelsius(value: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? ((value - 32) * 5) / 9 : value;
}

export function convertTemperatureUnitValue(
  value: number,
  sourceUnit: TemperatureUnit | undefined,
  targetUnit: TemperatureUnit
): number {
  const normalizedSourceUnit = sourceUnit ?? 'celsius';

  if (normalizedSourceUnit === targetUnit) {
    return value;
  }

  return targetUnit === 'fahrenheit'
    ? convertCelsiusToTemperatureUnit(value, 'fahrenheit')
    : convertTemperatureUnitToCelsius(value, 'fahrenheit');
}

export function convertDisplayTemperatureToSourceUnit(
  value: number,
  displayUnit: TemperatureUnit,
  sourceUnit: TemperatureUnit | undefined
): number {
  const normalizedSourceUnit = sourceUnit ?? 'celsius';

  if (displayUnit === normalizedSourceUnit) {
    return value;
  }

  return normalizedSourceUnit === 'fahrenheit'
    ? convertCelsiusToTemperatureUnit(value, 'fahrenheit')
    : convertTemperatureUnitToCelsius(value, 'fahrenheit');
}

export function formatDisplayTemperature(value: number): string {
  return Number.isInteger(value) ? value.toFixed(0) : value.toFixed(1);
}

export function formatTemperature(value: number, unit: TemperatureUnit): string {
  const displayValue = formatDisplayTemperature(
    Math.round(convertCelsiusToTemperatureUnit(value, unit))
  );

  return `${displayValue}${getTemperatureUnitSymbol(unit)}`;
}

export function formatTemperatureValue(value: number, unit: TemperatureUnit): string {
  return formatDisplayTemperature(Math.round(convertCelsiusToTemperatureUnit(value, unit)));
}

export function formatTemperatureFromSourceUnit(
  value: number,
  sourceUnit: TemperatureUnit | undefined,
  displayUnit: TemperatureUnit
): string {
  const displayValue = formatDisplayTemperature(
    Math.round(convertTemperatureUnitValue(value, sourceUnit, displayUnit))
  );

  return `${displayValue}${getTemperatureUnitSymbol(displayUnit)}`;
}

export function formatTemperatureValueFromSourceUnit(
  value: number,
  sourceUnit: TemperatureUnit | undefined,
  displayUnit: TemperatureUnit
): string {
  return formatDisplayTemperature(
    Math.round(convertTemperatureUnitValue(value, sourceUnit, displayUnit))
  );
}
