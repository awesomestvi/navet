export const energyIntegrationFixtures = {
  energyPreferences: {
    energy_sources: [
      {
        type: 'grid',
        flow_from: [{ stat_energy_from: 'sensor.grid_import_energy' }],
        flow_to: [{ stat_energy_to: 'sensor.grid_export_energy' }],
      },
      {
        type: 'solar',
        stat_energy_from: 'sensor.solar_energy',
        config_entry_solar_forecast: null,
      },
    ],
    device_consumption: [{ stat_consumption: 'sensor.heat_pump_energy' }],
  },
};
