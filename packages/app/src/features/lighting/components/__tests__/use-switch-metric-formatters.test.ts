import { renderHookWithProviders } from '@navet/app/test/render';
import { describe, expect, it } from 'vitest';
import {
  getSwitchMetricDisplayLabel,
  useSwitchMetricFormatters,
} from '../use-switch-metric-formatters';

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

  it('formats zero power as a visible reading', () => {
    const { result } = renderHookWithProviders(() =>
      useSwitchMetricFormatters({
        deviceName: 'Espresso Machine',
        labels: {
          power: 'Power',
          voltage: 'Voltage',
          energy: 'Energy',
        },
      })
    );

    expect(
      result.current.formatMetricValue({
        label: 'Power',
        value: 0,
        unit: 'W',
        icon: 'zap',
        category: 'measurement',
      })
    ).toBe('0 W');
  });

  it('formats generic numeric metrics without collapsing useful decimals', () => {
    const { result } = renderHookWithProviders(() =>
      useSwitchMetricFormatters({
        deviceName: 'Server Rack',
        labels: {
          power: 'Power',
          voltage: 'Voltage',
          energy: 'Energy',
        },
      })
    );

    expect(
      result.current.formatMetricValue({
        label: 'Current',
        value: 0.43,
        unit: 'A',
        icon: 'activity',
        category: 'measurement',
      })
    ).toBe('0.43 A');
    expect(
      result.current.formatMetricValue({
        label: 'Grow Tent Humidity',
        value: 47.2,
        unit: '%',
        icon: 'droplets',
        category: 'measurement',
      })
    ).toBe('47.2 %');
  });
});
