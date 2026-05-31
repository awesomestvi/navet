import { describe, expect, it } from 'vitest';
import { getHvacTemperatureStatusLabel } from '../hvac-temperature-status-label';

const t = (key: string, values?: Record<string, unknown>) => `${key}:${values?.temp}`;

describe('getHvacTemperatureStatusLabel', () => {
  it('uses cooling copy when visual mode is cool even if target is above current', () => {
    expect(getHvacTemperatureStatusLabel(t, 22, 20, 'cool')).toBe('climate.coolingDownTo:22');
  });

  it('uses heating copy when visual mode is heat even if target is below current', () => {
    expect(getHvacTemperatureStatusLabel(t, 18, 21, 'heat')).toBe('climate.heatingTo:18');
  });

  it('falls back to target and current temperature comparison for unknown visual mode', () => {
    expect(getHvacTemperatureStatusLabel(t, 18, 21, 'idle')).toBe('climate.coolingDownTo:18');
    expect(getHvacTemperatureStatusLabel(t, 22, 20, 'idle')).toBe('climate.heatingTo:22');
  });
});
