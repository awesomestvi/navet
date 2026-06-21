import { describe, expect, it } from 'vitest';
import { getClimateTemperatureStatusLabel } from '../climate-temperature-status-label';

const t = (key: string, values?: Record<string, unknown>) =>
  values && 'temp' in values ? `${key}:${values.temp}` : key;

describe('getClimateTemperatureStatusLabel', () => {
  it('uses cooling copy when visual mode is cool even if target is above current', () => {
    expect(getClimateTemperatureStatusLabel(t, 22, 20, 'cool')).toBe('climate.coolingDownTo:22');
  });

  it('uses heating copy when visual mode is heat even if target is below current', () => {
    expect(getClimateTemperatureStatusLabel(t, 18, 21, 'heat')).toBe('climate.heatingTo:18');
  });

  it('uses idle copy when visual mode is idle', () => {
    expect(getClimateTemperatureStatusLabel(t, 76, 75, 'idle')).toBe('climate.idle');
  });

  it('uses off copy when visual mode is off', () => {
    expect(getClimateTemperatureStatusLabel(t, 24, 25.7, 'off')).toBe('common.off');
  });

  it('falls back to target and current temperature comparison for unknown visual mode', () => {
    expect(getClimateTemperatureStatusLabel(t, 18, 21, 'auto')).toBe('climate.coolingDownTo:18');
    expect(getClimateTemperatureStatusLabel(t, 22, 20, 'auto')).toBe('climate.heatingTo:22');
  });
});
