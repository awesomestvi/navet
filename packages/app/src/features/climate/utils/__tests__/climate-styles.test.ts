import { describe, expect, it } from 'vitest';
import { getClimateModeButtonColor } from '../climate-styles';

describe('getClimateModeButtonColor', () => {
  it('marks fan_only active for the fan control', () => {
    expect(getClimateModeButtonColor('fan', 'fan_only', true)).toContain('from-green-400');
  });

  it('marks heat_cool active for the auto control', () => {
    expect(getClimateModeButtonColor('auto', 'heat_cool', true)).toContain('from-cyan-400');
  });
});
