import { describe, expect, it } from 'vitest';
import { getHVACModeButtonColor } from '../hvac-styles';

describe('getHVACModeButtonColor', () => {
  it('marks fan_only active for the fan control', () => {
    expect(getHVACModeButtonColor('fan', 'fan_only', true)).toContain('from-green-400');
  });

  it('marks heat_cool active for the auto control', () => {
    expect(getHVACModeButtonColor('auto', 'heat_cool', true)).toContain('from-cyan-400');
  });
});
