import { describe, expect, it } from 'vitest';
import { resolveHvacModeControlOptions } from '../hvac-mode-control-options';

describe('resolveHvacModeControlOptions', () => {
  it('returns default cool, heat, and fan controls when supported modes are unknown', () => {
    expect(resolveHvacModeControlOptions()).toEqual([
      { key: 'cool', mode: 'cool' },
      { key: 'heat', mode: 'heat' },
      { key: 'fan', mode: 'fan' },
    ]);
  });

  it('hides fan when only heat and cool are supported', () => {
    expect(resolveHvacModeControlOptions(['heat', 'cool'])).toEqual([
      { key: 'cool', mode: 'cool' },
      { key: 'heat', mode: 'heat' },
    ]);
  });

  it('maps the fan control to fan_only when Home Assistant supports fan_only', () => {
    expect(resolveHvacModeControlOptions(['heat', 'cool', 'fan_only'])).toEqual([
      { key: 'cool', mode: 'cool' },
      { key: 'heat', mode: 'heat' },
      { key: 'fan', mode: 'fan_only' },
    ]);
  });

  it('maps heat_cool to the auto range control', () => {
    expect(resolveHvacModeControlOptions(['dry', 'auto', 'heat_cool'])).toEqual([
      { key: 'auto', mode: 'heat_cool' },
    ]);
  });
});
