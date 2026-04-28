import { themeColorValues } from '@/app/components/shared/theme/theme-colors';
import type {
  EnergyConsumerCategory,
  EnergyFlowDatum,
  EnergyFlowSourceType,
  EnergyNodeId,
} from '../types/energy.types';

export const FLOW_TO_NODE_ID: Record<string, string> = {
  battery: 'battery-pack',
  solar: 'solar-array',
  grid: 'grid-meter',
  heating: 'hvac-main',
  mobility: 'ev-charger',
};

export const FLOW_TONE_GRADIENT: Record<EnergyFlowDatum['tone'], string> = {
  solar: 'linear-gradient(90deg, #facc15, #fb923c)',
  battery: 'linear-gradient(90deg, #22c55e, #14b8a6)',
  grid: 'linear-gradient(90deg, #60a5fa, #2563eb)',
  heating: 'linear-gradient(90deg, #fb7185, #f97316)',
  load: 'linear-gradient(90deg, #a78bfa, #60a5fa)',
};

export const FLOW_TONE_ACCENT: Record<EnergyFlowDatum['tone'], string> = {
  solar: '#f59e0b',
  battery: '#34d399',
  grid: '#60a5fa',
  heating: '#f97316',
  load: '#8b5cf6',
};

export const HEATING_CATEGORIES: ReadonlySet<EnergyConsumerCategory> = new Set([
  'water_heater',
  'toilet_heater',
  'bathroom_heater',
  'floor_heating',
  'hvac',
]);

export const ENERGY_SOURCE_ACCENTS: Record<EnergyFlowSourceType, string> = {
  solar: themeColorValues.yellow,
  grid: themeColorValues.blue,
  battery: themeColorValues.teal,
  gas: themeColorValues.red,
  renewable: themeColorValues.green,
  home: themeColorValues.purple,
};

export const ENERGY_NODE_LAYOUT: Record<EnergyNodeId, { x: number; y: number }> = {
  home: { x: 45, y: 50 },
  renewable: { x: 15, y: 16 },
  solar: { x: 15, y: 33 },
  grid: { x: 13, y: 50 },
  battery: { x: 15, y: 67 },
  gas: { x: 15, y: 84 },
};
