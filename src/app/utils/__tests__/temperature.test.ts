import { describe, expect, it } from 'vitest';
import {
  convertCelsiusToTemperatureUnit,
  convertDisplayTemperatureToSourceUnit,
  convertTemperatureUnitToCelsius,
  convertTemperatureUnitValue,
  formatTemperature,
  formatTemperatureFromSourceUnit,
  formatTemperatureValue,
  formatTemperatureValueFromSourceUnit,
  getTemperatureUnitSymbol,
  normalizeTemperatureUnit,
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

  it('normalizes Home Assistant temperature unit strings', () => {
    expect(normalizeTemperatureUnit('°F')).toBe('fahrenheit');
    expect(normalizeTemperatureUnit('F')).toBe('fahrenheit');
    expect(normalizeTemperatureUnit('fahrenheit')).toBe('fahrenheit');
    expect(normalizeTemperatureUnit('°C')).toBe('celsius');
    expect(normalizeTemperatureUnit('C')).toBe('celsius');
    expect(normalizeTemperatureUnit('celsius')).toBe('celsius');
    expect(normalizeTemperatureUnit('%')).toBeUndefined();
  });

  it('keeps Fahrenheit source values unchanged for Fahrenheit display', () => {
    expect(convertTemperatureUnitValue(72, 'fahrenheit', 'fahrenheit')).toBe(72);
    expect(formatTemperatureFromSourceUnit(72, 'fahrenheit', 'fahrenheit')).toBe('72°F');
    expect(formatTemperatureValueFromSourceUnit(72, 'fahrenheit', 'fahrenheit')).toBe('72');
  });

  it('converts Fahrenheit source values to Celsius display values', () => {
    expect(formatTemperatureFromSourceUnit(72, 'fahrenheit', 'celsius')).toBe('22°C');
  });

  it('converts Celsius source values to Fahrenheit display values', () => {
    expect(formatTemperatureFromSourceUnit(22, 'celsius', 'fahrenheit')).toBe('72°F');
  });

  it('keeps unknown source values on the existing Celsius-assuming path', () => {
    expect(formatTemperatureFromSourceUnit(21, undefined, 'fahrenheit')).toBe('70°F');
  });

  it('converts display temperatures back to the Home Assistant source unit', () => {
    expect(convertDisplayTemperatureToSourceUnit(73, 'fahrenheit', 'fahrenheit')).toBe(73);
    expect(Math.round(convertDisplayTemperatureToSourceUnit(73, 'fahrenheit', 'celsius'))).toBe(23);
  });
});
