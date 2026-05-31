import { makeHassEntityFixture } from '@navet/app/test/fixtures/home-assistant/shared';
import { describe, expect, it } from 'vitest';
import {
  type EnergyEntityMap,
  isMissingEnergyPrefsError,
  resolveTodayEnergyKWh,
} from '../use-energy-ha-data';

function energyEntity(
  entityId: string,
  state: string,
  unit: 'kWh' | 'Wh',
  friendlyName: string
): EnergyEntityMap[string] {
  const entity = makeHassEntityFixture({
    entityId,
    state,
    attributes: {
      friendly_name: friendlyName,
      unit_of_measurement: unit,
    },
  });

  return {
    state: entity.state,
    attributes: entity.attributes as Record<string, unknown>,
  };
}

describe('resolveTodayEnergyKWh', () => {
  it('prefers a daily total entity state when recorder statistics are behind', () => {
    expect(
      resolveTodayEnergyKWh(
        {
          'sensor.grid_import_today': energyEntity(
            'sensor.grid_import_today',
            '14.89',
            'kWh',
            'Grid import today'
          ),
        },
        'sensor.grid_import_today',
        14
      )
    ).toBe(14.89);
  });

  it('keeps recorder statistics for cumulative energy meters', () => {
    expect(
      resolveTodayEnergyKWh(
        {
          'sensor.grid_import_total': energyEntity(
            'sensor.grid_import_total',
            '12450.89',
            'kWh',
            'Grid import total'
          ),
        },
        'sensor.grid_import_total',
        14
      )
    ).toBe(14);
  });

  it('converts Wh daily states before comparing with statistics', () => {
    expect(
      resolveTodayEnergyKWh(
        {
          'sensor.grid_import_today': energyEntity(
            'sensor.grid_import_today',
            '14890',
            'Wh',
            'Grid import today'
          ),
        },
        'sensor.grid_import_today',
        14
      )
    ).toBe(14.89);
  });
});

describe('isMissingEnergyPrefsError', () => {
  it('treats Home Assistant no-prefs responses as an expected empty state', () => {
    expect(isMissingEnergyPrefsError({ code: 'not_found', message: 'No prefs' })).toBe(true);
  });

  it('does not hide other websocket errors', () => {
    expect(isMissingEnergyPrefsError({ code: 'not_found', message: 'Something else' })).toBe(false);
    expect(isMissingEnergyPrefsError({ code: 'unknown_error', message: 'No prefs' })).toBe(false);
    expect(isMissingEnergyPrefsError(null)).toBe(false);
  });
});
