export type EnergyConsumerCategory =
  | 'ev_charger'
  | 'water_heater'
  | 'toilet_heater'
  | 'bathroom_heater'
  | 'floor_heating'
  | 'hvac'
  | 'washer'
  | 'dryer'
  | 'dishwasher'
  | 'other';

export interface EnergyDeviceSource {
  entityId: string;
  name: string;
  category: EnergyConsumerCategory;
  powerEntityId?: string;
}

export interface EnergySourceConfig {
  solarPowerEntityId?: string;
  batterySocEntityId?: string;
  batteryPowerEntityId?: string;
  gridImportPowerEntityId?: string;
  gridExportPowerEntityId?: string;
  homeLoadPowerEntityId?: string;
  solarEnergyEntityId?: string;
  gridImportEnergyEntityId?: string;
  gridExportEnergyEntityId?: string;
  gasEnergyEntityId?: string;
  hotWaterEnergyEntityId?: string;
  devices: EnergyDeviceSource[];
}
