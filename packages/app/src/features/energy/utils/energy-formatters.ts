import type { EnergyNodeUnit } from '../types/energy.types';
import { ENERGY_METRIC_DECIMALS } from './energy-constants';

export function roundEnergyValue(value: number, digits = ENERGY_METRIC_DECIMALS) {
  const factor = 10 ** digits;
  return Math.round(value * factor) / factor;
}

export function formatEnergyValue(value: number, digits = ENERGY_METRIC_DECIMALS) {
  return roundEnergyValue(value, digits).toFixed(digits);
}

export function formatEnergyNodeValue(value: number, unit: EnergyNodeUnit | undefined) {
  return formatEnergyValue(value, unit === '%' ? 0 : 1);
}

export function formatEnergyPercent(value: number) {
  return formatEnergyValue(value, 0);
}
