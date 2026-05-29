import { homeAssistantEnergyFeatureService } from '@navet/provider-homeassistant/homeassistant-energy-feature.service';
import { describe, expect, it, vi } from 'vitest';

describe('homeAssistantEnergyFeatureService', () => {
  it('maps Home Assistant energy prefs into a Navet energy source config', async () => {
    const messageClient = {
      sendMessagePromise: vi.fn().mockResolvedValue({
        energy_sources: [
          {
            type: 'grid',
            stat_energy_from: 'sensor.grid_import_energy',
            stat_energy_to: 'sensor.grid_export_energy',
          },
          {
            type: 'solar',
            stat_energy_from: 'sensor.solar_energy',
          },
        ],
        device_consumption: [{ stat_consumption: 'sensor.heat_pump_energy', name: 'Heat pump' }],
      }),
    };

    await expect(homeAssistantEnergyFeatureService.getSourceConfig(messageClient)).resolves.toEqual(
      {
        devices: [
          {
            entityId: 'sensor.heat_pump_energy',
            name: 'Heat pump',
            category: 'hvac',
          },
        ],
        gridExportEnergyEntityId: 'sensor.grid_export_energy',
        gridImportEnergyEntityId: 'sensor.grid_import_energy',
        solarEnergyEntityId: 'sensor.solar_energy',
      }
    );
  });

  it('augments a source config with inferred live power entities from runtime state', () => {
    const augmented = homeAssistantEnergyFeatureService.augmentSourceConfig(
      {
        devices: [{ entityId: 'sensor.heat_pump_energy', name: 'Heat pump', category: 'hvac' }],
        gridImportEnergyEntityId: 'sensor.grid_import_energy',
      },
      {
        'sensor.grid_import_energy': {
          state: '1200',
          attributes: { device_class: 'energy', unit_of_measurement: 'kWh' },
        },
        'sensor.grid_power': {
          state: '850',
          attributes: { device_class: 'power', unit_of_measurement: 'W' },
        },
        'sensor.heat_pump_energy': {
          state: '100',
          attributes: { device_class: 'energy', unit_of_measurement: 'kWh' },
        },
        'sensor.heat_pump_power': {
          state: '340',
          attributes: { device_class: 'power', unit_of_measurement: 'W' },
        },
      },
      [
        { entity_id: 'sensor.grid_import_energy', device_id: 'grid-device' },
        { entity_id: 'sensor.grid_power', device_id: 'grid-device' },
        { entity_id: 'sensor.heat_pump_energy', device_id: 'heat-pump-device' },
        { entity_id: 'sensor.heat_pump_power', device_id: 'heat-pump-device' },
      ]
    );

    expect(augmented.gridImportPowerEntityId).toBe('sensor.grid_power');
    expect(augmented.homeLoadPowerEntityId).toBe('sensor.grid_power');
    expect(augmented.devices[0]?.powerEntityId).toBe('sensor.heat_pump_power');
  });
});
