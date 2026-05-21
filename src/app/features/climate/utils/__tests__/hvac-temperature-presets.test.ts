import { describe, expect, it } from 'vitest';
import { convertCelsiusPresetToSourceUnit } from '../hvac-temperature-presets';

describe('HVAC temperature presets', () => {
  it('keeps Celsius comfort presets in Celsius-backed climate source units', () => {
    expect(convertCelsiusPresetToSourceUnit(21, 'celsius')).toBe(21);
    expect(convertCelsiusPresetToSourceUnit(21, undefined)).toBe(21);
  });

  it('converts Celsius comfort presets before committing to Fahrenheit-backed climate source units', () => {
    expect(convertCelsiusPresetToSourceUnit(18, 'fahrenheit')).toBeCloseTo(64.4);
    expect(convertCelsiusPresetToSourceUnit(21, 'fahrenheit')).toBeCloseTo(69.8);
    expect(convertCelsiusPresetToSourceUnit(24, 'fahrenheit')).toBeCloseTo(75.2);
  });
});
