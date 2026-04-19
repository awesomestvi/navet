import type { HVACSiblingEntity } from '../hvac-card/use-hvac-card-controller';

export interface HVACTemperaturePreset {
  value: number;
  label?: string;
}

export interface HVACSettingsDialogProps {
  entityId: string;
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  name: string;
  isOn: boolean;
  mode: string;
  targetTemp: number;
  currentTemp: number;
  minTemp?: number;
  maxTemp?: number;
  step?: number;
  temperaturePresets?: HVACTemperaturePreset[];
  siblingEntities?: HVACSiblingEntity[];
  onModeChange: (mode: string) => void;
  onTargetTempChange: (temp: number) => void;
  onTargetTempCommit?: (temp: number) => void;
}
