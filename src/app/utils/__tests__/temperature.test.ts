import { describe, expect, it } from 'vitest';
import {
  convertCelsiusToTemperatureUnit,
  convertTemperatureUnitToCelsius,
  formatTemperature,
  formatTemperatureValue,
  getTemperatureUnitSymbol,
} from '../temperature';

describe('temperature utilities', () => {
  it('keeps Celsius values unchanged for Celsius display', () => {
    expect(convertCelsiusToTemperatureUnit(21, 'celsius')).toBe(21);
    expect(formatTemperature(21, 'celsius')).toBe('21°C');
  });

  it('converts Celsius values to rounded Fahrenheit display values', () => {
    expect(formatTemperature(0, 'fahrenheit')).toBe('32°F');
    expect(formatTemperature(21, 'fahrenheit')).toBe('70°F');
  });

  it('converts Fahrenheit input back to Celsius for Home Assistant service calls', () => {
    expect(convertTemperatureUnitToCelsius(68, 'fahrenheit')).toBe(20);
    expect(convertTemperatureUnitToCelsius(21, 'celsius')).toBe(21);
  });

  it('formats fractional values consistently', () => {
    expect(formatTemperatureValue(21.4, 'celsius')).toBe('21');
    expect(formatTemperatureValue(21.5, 'celsius')).toBe('22');
    expect(formatTemperatureValue(20.5, 'fahrenheit')).toBe('69');
  });

  it('returns display unit symbols', () => {
    expect(getTemperatureUnitSymbol('celsius')).toBe('°C');
    expect(getTemperatureUnitSymbol('fahrenheit')).toBe('°F');
  });
});
