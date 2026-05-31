import { describe, expect, it } from 'vitest';
import { getSwitchMetricDisplayLabel } from '../use-switch-metric-formatters';

describe('getSwitchMetricDisplayLabel', () => {
  it('trims the shared device prefix from switch metric labels', () => {
    expect(
      getSwitchMetricDisplayLabel('Pax Calima Fanspeed Humidity', 'Pax Calima BoostMode')
    ).toBe('Fanspeed Humidity');
    expect(getSwitchMetricDisplayLabel('Pax Calima Fanspeed Light', 'Pax Calima BoostMode')).toBe(
      'Fanspeed Light'
    );
  });

  it('keeps labels unchanged when they do not share a prefix', () => {
    expect(getSwitchMetricDisplayLabel('Outdoor Humidity', 'Pax Calima BoostMode')).toBe(
      'Outdoor Humidity'
    );
  });
});
