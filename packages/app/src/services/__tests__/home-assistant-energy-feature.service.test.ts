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
            stat_rate: 'sensor.total_active_power',
          },
          {
            type: 'solar',
            stat_energy_from: 'sensor.solar_energy',
            stat_rate: 'sensor.solar_power',
          },
          {
            type: 'battery',
            stat_energy_from: 'sensor.battery_discharge_energy',
            stat_energy_to: 'sensor.battery_charge_energy',
            stat_rate: 'sensor.battery_power',
          },
        ],
        device_consumption: [
          {
            stat_consumption: 'sensor.heat_pump_energy',
            stat_rate: 'sensor.heat_pump_power',
            name: 'Heat pump',
          },
        ],
        device_consumption_water: [
          {
            stat_consumption: 'sensor.hot_water_energy',
            stat_rate: 'sensor.hot_water_power',
            name: 'Hot water',
          },
        ],
      }),
    };

    await expect(homeAssistantEnergyFeatureService.getSourceConfig(messageClient)).resolves.toEqual(
      {
        devices: [
          {
            entityId: 'sensor.heat_pump_energy',
            name: 'Heat pump',
            category: 'hvac',
            powerEntityId: 'sensor.heat_pump_power',
          },
          {
            entityId: 'sensor.hot_water_energy',
            name: 'Hot water',
            category: 'water_heater',
            powerEntityId: 'sensor.hot_water_power',
          },
        ],
        gridExportEnergyEntityId: 'sensor.grid_export_energy',
        gridImportEnergyEntityId: 'sensor.grid_import_energy',
        gridImportPowerEntityId: 'sensor.total_active_power',
        batteryPowerEntityId: 'sensor.battery_power',
        solarEnergyEntityId: 'sensor.solar_energy',
        solarPowerEntityId: 'sensor.solar_power',
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
        { entityId: 'sensor.grid_import_energy', deviceId: 'grid-device' },
        { entityId: 'sensor.grid_power', deviceId: 'grid-device' },
        { entityId: 'sensor.heat_pump_energy', deviceId: 'heat-pump-device' },
        { entityId: 'sensor.heat_pump_power', deviceId: 'heat-pump-device' },
      ]
    );

    expect(augmented.gridImportPowerEntityId).toBe('sensor.grid_power');
    expect(augmented.homeLoadPowerEntityId).toBe('sensor.grid_power');
    expect(augmented.devices[0]?.powerEntityId).toBe('sensor.heat_pump_power');
  });

  it('preserves explicit power entities from Home Assistant prefs during augmentation', () => {
    const augmented = homeAssistantEnergyFeatureService.augmentSourceConfig(
      {
        devices: [
          {
            entityId: 'sensor.total_energy_consumed',
            name: 'Whole home',
            category: 'other',
            powerEntityId: 'sensor.total_active_power',
          },
        ],
        gridImportEnergyEntityId: 'sensor.total_energy_consumed',
        gridImportPowerEntityId: 'sensor.total_active_power',
      },
      {
        'sensor.total_energy_consumed': {
          state: '1200',
          attributes: { device_class: 'energy', unit_of_measurement: 'kWh' },
        },
        'sensor.total_active_power': {
          state: '850',
          attributes: { device_class: 'power', unit_of_measurement: 'W' },
        },
        'sensor.power_a': {
          state: '300',
          attributes: { device_class: 'power', unit_of_measurement: 'W' },
        },
        'sensor.power_b': {
          state: '250',
          attributes: { device_class: 'power', unit_of_measurement: 'W' },
        },
        'sensor.power_c': {
          state: '300',
          attributes: { device_class: 'power', unit_of_measurement: 'W' },
        },
      },
      [
        { entityId: 'sensor.total_energy_consumed', deviceId: 'grid-device' },
        { entityId: 'sensor.power_a', deviceId: 'grid-device' },
        { entityId: 'sensor.power_b', deviceId: 'grid-device' },
        { entityId: 'sensor.power_c', deviceId: 'grid-device' },
        { entityId: 'sensor.total_active_power', deviceId: 'grid-device' },
      ]
    );

    expect(augmented.gridImportPowerEntityId).toBe('sensor.total_active_power');
    expect(augmented.homeLoadPowerEntityId).toBe('sensor.total_active_power');
    expect(augmented.devices[0]?.powerEntityId).toBe('sensor.total_active_power');
  });
});
