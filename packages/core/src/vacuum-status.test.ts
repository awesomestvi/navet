import { describe, expect, it } from 'vitest';
import { normalizeVacuumStatus } from './vacuum-status';

describe('normalizeVacuumStatus', () => {
  it.each([
    [' Mowing ', 'cleaning'],
    ['washing mop', 'mopping'],
    ['mop drying', 'drying'],
    ['returning home', 'returning'],
    ['fully charged', 'charging-complete'],
    ['charging_complete', 'charging-complete'],
    ['sleeping', 'idle'],
    ['fault', 'error'],
  ] as const)('normalizes %s to %s', (raw, expected) => {
    expect(normalizeVacuumStatus(raw)).toBe(expected);
  });

  it.each([undefined, null, 42, {}, 'unknown', 'unavailable', ''])(
    'preserves the caller fallback for unavailable state %s',
    (raw) => {
      expect(normalizeVacuumStatus(raw, 'docked')).toBe('docked');
      expect(normalizeVacuumStatus(raw)).toBe('idle');
    }
  );
});
