import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import type { SecuritySeverity } from '@navet/app/types/device.types';

export interface SensorQualityModel {
  accentColor: string;
  labels: readonly [string, string, string];
  percentage: number;
}

const AIR_QUALITY_DEVICE_CLASSES = new Set([
  'air_quality',
  'carbon_dioxide',
  'carbon_monoxide',
  'pm1',
  'pm10',
  'pm25',
  'volatile_organic_compounds',
]);

function clampPercentage(value: number) {
  return Math.min(100, Math.max(0, value));
}

function getHumidityQuality(value: number): SensorQualityModel {
  const isComfortable = value >= 30 && value <= 60;
  return {
    percentage: clampPercentage(value),
    accentColor: isComfortable ? themeColorValues.teal : themeColorValues.orange,
    labels: ['<30%', '30–60%', '>60%'],
  };
}

function getAirQualityScale(deviceClass: string, unit: string) {
  if (deviceClass === 'carbon_dioxide' || unit.toLowerCase() === 'ppm') {
    return { good: 800, attention: 1200, maximum: 2000, unit: 'ppm' };
  }
  if (deviceClass === 'pm25') {
    return { good: 12, attention: 35, maximum: 75, unit };
  }
  if (deviceClass === 'pm10') {
    return { good: 54, attention: 154, maximum: 254, unit };
  }
  if (deviceClass === 'air_quality') {
    return { good: 50, attention: 100, maximum: 200, unit };
  }
  return { good: 250, attention: 500, maximum: 1000, unit };
}

function formatThreshold(value: number, unit: string) {
  return `${value.toLocaleString()}${unit ? ` ${unit}` : ''}`;
}

function getAirQuality(
  value: number,
  deviceClass: string,
  unit: string,
  severity: SecuritySeverity | undefined
): SensorQualityModel {
  const scale = getAirQualityScale(deviceClass, unit);
  const accentColor =
    severity === 'critical'
      ? themeColorValues.red
      : severity === 'warning' || severity === 'active'
        ? themeColorValues.orange
        : themeColorValues.teal;
  return {
    percentage: clampPercentage((value / scale.maximum) * 100),
    accentColor,
    labels: [
      `≤${formatThreshold(scale.good, scale.unit)}`,
      formatThreshold(scale.attention, scale.unit),
      `>${formatThreshold(scale.attention, scale.unit)}`,
    ],
  };
}

export function getSensorQualityModel(
  deviceClass: string | undefined,
  value: string,
  unit: string,
  severity?: SecuritySeverity
): SensorQualityModel | null {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) return null;

  const normalizedClass = deviceClass?.trim().toLowerCase();
  if (normalizedClass === 'humidity') return getHumidityQuality(numericValue);
  if (normalizedClass && AIR_QUALITY_DEVICE_CLASSES.has(normalizedClass)) {
    return getAirQuality(numericValue, normalizedClass, unit, severity);
  }
  return null;
}
