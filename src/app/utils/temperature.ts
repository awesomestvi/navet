export type TemperatureUnit = 'celsius' | 'fahrenheit';

export function getTemperatureUnitSymbol(unit: TemperatureUnit): '°C' | '°F' {
  return unit === 'fahrenheit' ? '°F' : '°C';
}

export function convertCelsiusToTemperatureUnit(value: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? (value * 9) / 5 + 32 : value;
}

export function convertTemperatureUnitToCelsius(value: number, unit: TemperatureUnit): number {
  return unit === 'fahrenheit' ? ((value - 32) * 5) / 9 : value;
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
