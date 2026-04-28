import { describe, expect, it } from 'vitest';
import {
  buildConfigFromDraft,
  buildEnergyEntityOptions,
  createEnergySetupDraft,
  filterEnergyEntityOptions,
  hasCompleteEssentials,
  mergeDetectedConfigIntoDraft,
  scoreEnergySetupDraft,
} from '../energy-setup-wizard.helpers';

describe('energy setup wizard helpers', () => {
  it('scores incomplete, minimal, and richer drafts progressively', () => {
    const emptyDraft = createEnergySetupDraft();
    const essentialsDraft = createEnergySetupDraft({
      homeLoadPowerEntityId: 'sensor.home_load_power',
      gridImportPowerEntityId: 'sensor.grid_import_power',
      gridImportEnergyEntityId: 'sensor.energy_today',
      devices: [],
    });
    const richDraft = createEnergySetupDraft({
      homeLoadPowerEntityId: 'sensor.home_load_power',
      gridImportPowerEntityId: 'sensor.grid_import_power',
      gridImportEnergyEntityId: 'sensor.energy_today',
      solarPowerEntityId: 'sensor.solar_power',
      solarEnergyEntityId: 'sensor.solar_energy',
      batterySocEntityId: 'sensor.battery_level',
      batteryPowerEntityId: 'sensor.battery_power',
      devices: [
        {
          entityId: 'sensor.dishwasher_energy',
          name: 'Dishwasher',
          category: 'dishwasher',
          powerEntityId: 'sensor.dishwasher_power',
        },
      ],
    });

    expect(scoreEnergySetupDraft(emptyDraft).score).toBeLessThan(
      scoreEnergySetupDraft(essentialsDraft).score
    );
    expect(scoreEnergySetupDraft(essentialsDraft).score).toBeLessThan(
      scoreEnergySetupDraft(richDraft).score
    );
    expect(hasCompleteEssentials(essentialsDraft)).toBe(true);
  });

  it('builds entity options with human labels first and entity ids second', () => {
    const options = buildEnergyEntityOptions(
      {
        'sensor.kitchen_energy': {
          entity_id: 'sensor.kitchen_energy',
          state: '2.1',
          attributes: {
            friendly_name: 'Kitchen Energy',
            device_class: 'energy',
            unit_of_measurement: 'kWh',
            state_class: 'total_increasing',
          },
        },
      },
      'energy-stat'
    );

    expect(options).toEqual([
      expect.objectContaining({
        label: 'Kitchen Energy',
        description: 'sensor.kitchen_energy',
      }),
    ]);
    expect(filterEnergyEntityOptions(options, 'kitchen')[0]?.value).toBe('sensor.kitchen_energy');
  });

  it('keeps optional sources out of the saved config when disabled', () => {
    const draft = createEnergySetupDraft({
      homeLoadPowerEntityId: 'sensor.home_load_power',
      gridImportPowerEntityId: 'sensor.grid_import_power',
      gridImportEnergyEntityId: 'sensor.energy_today',
      solarPowerEntityId: 'sensor.solar_power',
      solarEnergyEntityId: 'sensor.solar_energy',
      devices: [],
    });

    draft.solarEnabled = false;
    draft.devices = [
      {
        entityId: 'sensor.dishwasher_energy',
        name: 'Dishwasher',
        category: 'dishwasher',
      },
    ];

    expect(buildConfigFromDraft(draft)).toEqual(
      expect.objectContaining({
        solarPowerEntityId: undefined,
        solarEnergyEntityId: undefined,
        devices: [
          expect.objectContaining({
            entityId: 'sensor.dishwasher_energy',
            name: 'Dishwasher',
          }),
        ],
      })
    );
  });

  it('merges auto-detected config into the draft state', () => {
    const previousDraft = createEnergySetupDraft({
      homeLoadPowerEntityId: 'sensor.manual_home_load',
      devices: [],
    });
    const merged = mergeDetectedConfigIntoDraft(previousDraft, {
      homeLoadPowerEntityId: 'sensor.detected_home_load',
      gridImportPowerEntityId: 'sensor.detected_grid_import',
      gridImportEnergyEntityId: 'sensor.detected_energy_today',
      solarPowerEntityId: 'sensor.detected_solar_power',
      solarEnergyEntityId: 'sensor.detected_solar_energy',
      devices: [],
    });

    expect(merged.fields.homeLoadPowerEntityId).toBe('sensor.detected_home_load');
    expect(merged.fields.gridImportPowerEntityId).toBe('sensor.detected_grid_import');
    expect(merged.solarEnabled).toBe(true);
  });
});
