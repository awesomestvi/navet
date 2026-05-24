import { describe, expect, it } from 'vitest';
import { type EnergyEntityMap, resolveTodayEnergyKWh } from '../use-energy-ha-data';

function entities(map: EnergyEntityMap) {
  return map;
}

describe('resolveTodayEnergyKWh', () => {
  it('prefers a daily total entity state when recorder statistics are behind', () => {
    expect(
      resolveTodayEnergyKWh(
        entities({
          'sensor.grid_import_today': {
            state: '14.89',
            attributes: {
              friendly_name: 'Grid import today',
              unit_of_measurement: 'kWh',
            },
          },
        }),
        'sensor.grid_import_today',
        14
      )
    ).toBe(14.89);
  });

  it('keeps recorder statistics for cumulative energy meters', () => {
    expect(
      resolveTodayEnergyKWh(
        entities({
          'sensor.grid_import_total': {
            state: '12450.89',
            attributes: {
              friendly_name: 'Grid import total',
              unit_of_measurement: 'kWh',
            },
          },
        }),
        'sensor.grid_import_total',
        14
      )
    ).toBe(14);
  });

  it('converts Wh daily states before comparing with statistics', () => {
    expect(
      resolveTodayEnergyKWh(
        entities({
          'sensor.grid_import_today': {
            state: '14890',
            attributes: {
              friendly_name: 'Grid import today',
              unit_of_measurement: 'Wh',
            },
          },
        }),
        'sensor.grid_import_today',
        14
      )
    ).toBe(14.89);
  });
});
