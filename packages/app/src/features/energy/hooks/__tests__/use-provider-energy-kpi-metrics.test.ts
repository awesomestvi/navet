import type { SensorDevice } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { buildProviderEnergyKpiMetrics } from '../use-provider-energy-kpi-metrics';

function sensor(
  overrides: Partial<SensorDevice> & Pick<SensorDevice, 'id' | 'name'>
): SensorDevice {
  return {
    providerId: 'home_assistant',
    room: '',
    size: 'small',
    value: '0',
    unit: '',
    ...overrides,
  };
}

describe('buildProviderEnergyKpiMetrics', () => {
  it('discovers provider energy, power, cost, and prepaid readings', () => {
    const metrics = buildProviderEnergyKpiMetrics([
      sensor({
        id: 'sensor.remaining_electricity',
        canonicalId: 'home_assistant:sensor.remaining_electricity',
        name: 'Remaining electricity',
        value: '42.75',
        unit: 'kWh',
        deviceClass: 'energy',
        availability: 'available',
      }),
      sensor({
        id: 'sensor.energy_credit',
        name: 'Energy credit',
        value: '18.40',
        unit: 'SEK',
        deviceClass: 'monetary',
      }),
      sensor({
        id: 'sensor.house_power',
        name: 'House power',
        value: '510',
        unit: 'W',
        deviceClass: 'power',
      }),
      sensor({
        id: 'sensor.temperature',
        name: 'Outside temperature',
        value: '18',
        unit: '°C',
        deviceClass: 'temperature',
      }),
    ]);

    expect(metrics.map((metric) => metric.label)).toEqual([
      'Energy credit',
      'Remaining electricity',
      'House power',
    ]);
    expect(metrics[0]).toMatchObject({ kind: 'prepaid', value: '18.40', unit: 'SEK' });
    expect(metrics[1]).toMatchObject({
      sourceEntityId: 'home_assistant:sensor.remaining_electricity',
      kind: 'prepaid',
      value: '42.75',
      unit: 'kWh',
    });
    expect(metrics[2]).toMatchObject({ kind: 'power' });
  });
});
