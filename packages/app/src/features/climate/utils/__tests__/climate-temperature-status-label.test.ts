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

  it('keeps the target visible when visual mode is idle', () => {
    expect(getClimateTemperatureStatusLabel(t, '76°F', '75°F', 'idle')).toBe('climate.idle · 76°F');
  });

  it('keeps the last target visible when visual mode is off', () => {
    expect(getClimateTemperatureStatusLabel(t, '24°C', '25.7°C', 'off')).toBe('common.off · 24°C');
  });

  it('shows only the status when an idle or off climate device has no target', () => {
    expect(getClimateTemperatureStatusLabel(t, '21°C', '20°C', 'idle', 21, 20, false)).toBe(
      'climate.idle'
    );
    expect(getClimateTemperatureStatusLabel(t, '21°C', '20°C', 'off', 21, 20, false)).toBe(
      'common.off'
    );
  });

  it('falls back to target and current temperature comparison for unknown visual mode', () => {
    expect(getClimateTemperatureStatusLabel(t, 18, 21, 'auto')).toBe('climate.coolingDownTo:18');
    expect(getClimateTemperatureStatusLabel(t, 22, 20, 'auto')).toBe('climate.heatingTo:22');
  });
});
