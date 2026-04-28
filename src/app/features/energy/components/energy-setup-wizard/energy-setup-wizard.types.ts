import type { EnergyDeviceSource, EnergySourceConfig } from '../../types/energy.types';

export type EnergySetupFields = Omit<EnergySourceConfig, 'devices'>;

export interface EnergySetupDraft {
  fields: EnergySetupFields;
  solarEnabled: boolean;
  batteryEnabled: boolean;
  devices: EnergyDeviceSource[];
}

export interface EnergyEntityOption {
  value: string;
  label: string;
  description: string;
  keywords: string;
}

export type EnergyEntityPickerPreset = 'power' | 'energy-stat' | 'battery-soc';
