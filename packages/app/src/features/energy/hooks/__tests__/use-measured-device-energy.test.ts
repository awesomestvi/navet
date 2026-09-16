import type { SensorDevice } from '@navet/app/types/device.types';
import { describe, expect, it } from 'vitest';
import { buildMeasuredEnergyConsumers, energyChangeKWh } from '../use-measured-device-energy';

function sensor(overrides: Partial<SensorDevice>): SensorDevice {
  return {
    id: 'homey:plug#meter_power',
    providerId: 'homey',
    name: 'Coffee maker · Energy',
    sourceDeviceId: 'plug',
    sourceDeviceName: 'Coffee maker',
    room: 'Kitchen',
    size: 'small',
    value: '12.45',
    unit: 'kWh',
    ...overrides,
  };
}

describe('measured device energy', () => {
  it('pairs power and energy from the same device without treating its lifetime meter as today usage', () => {
    const meters = [
      sensor({}),
      sensor({ id: 'homey:plug#measure_power', value: '1.26', unit: 'kW' }),
      sensor({ id: 'home_assistant:sensor.energy', providerId: 'home_assistant' }),
    ];
    expect(buildMeasuredEnergyConsumers(meters)).toEqual([
      expect.objectContaining({
        id: 'homey:plug#meter_power',
        name: 'Coffee maker',
        powerW: 1260,
        energyKWh: 0,
        powerEntityId: 'homey:plug#measure_power',
      }),
    ]);
    expect(
      buildMeasuredEnergyConsumers(meters, { 'homey:plug#meter_power': 0.42 })[0]?.energyKWh
    ).toBe(0.42);
  });

  it('keeps power-only devices and additional measurements', () => {
    const devices = buildMeasuredEnergyConsumers([
      sensor({
        id: 'homey:lamp#measure_power',
        sourceDeviceId: 'lamp',
        sourceDeviceName: 'Desk lamp',
        unit: 'W',
        value: '9.4',
      }),
      sensor({}),
      sensor({ id: 'homey:plug#meter_power.second' }),
    ]);
    expect(devices).toHaveLength(3);
    expect(devices[0]).toMatchObject({ name: 'Desk lamp', powerW: 9.4 });
  });

  it('sums recorded meter changes, including resets, and converts Wh to kWh', () => {
    const points = ['1000', '1100', 'unknown', '20', '50'].map((state, index) => ({
      state,
      changedAt: new Date(2026, 8, 14, index).toISOString(),
    }));
    expect(energyChangeKWh(points, 'Wh')).toBeCloseTo(0.15);
    expect(energyChangeKWh(points.slice(0, 1), 'Wh')).toBe(0);
  });
});
