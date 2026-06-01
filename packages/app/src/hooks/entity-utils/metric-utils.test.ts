import { describe, expect, it } from 'vitest';
import { normalizeMetric } from './metric-utils';

describe('normalizeMetric', () => {
  it('normalizes current metrics in amps', () => {
    expect(normalizeMetric('current', 'Server Rack Current', 0.43, 'A')).toEqual({
      label: 'Current',
      value: 0.43,
      unit: 'A',
    });
  });

  it('normalizes current metrics from milliamps', () => {
    expect(normalizeMetric('current', 'Server Rack Current', 430, 'mA')).toEqual({
      label: 'Current',
      value: 0.43,
      unit: 'A',
    });
  });

  it('normalizes generic numeric metrics with their original label and unit', () => {
    expect(normalizeMetric('humidity', 'grow tent humidity', 47.2, '%')).toEqual({
      label: 'Grow Tent Humidity',
      value: 47.2,
      unit: '%',
    });
  });
});
