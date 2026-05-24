/**
 * Metric and sensor utilities
 */

import type { DeviceMetric } from '../../types/device.types';
import { toKilowattHours, toVolts, toWatts } from './numeric-utils';
import { formatTimestampTime } from './time-format';

export function inferMetricIcon(
  deviceClass: string | null,
  searchText: string,
  unit: unknown
): DeviceMetric['icon'] {
  const normalizedUnit = typeof unit === 'string' ? unit.toLowerCase() : '';
  const normalizedSearch = searchText.toLowerCase();

  if (
    deviceClass === 'motion' ||
    deviceClass === 'occupancy' ||
    normalizedSearch.includes('motion') ||
    normalizedSearch.includes('occupancy') ||
    normalizedSearch.includes('presence') ||
    normalizedSearch.includes('pir')
  ) {
    return 'motion';
  }

  if (
    deviceClass === 'power' ||
    normalizedSearch.includes('power') ||
    normalizedSearch.includes('watt') ||
    normalizedSearch.includes('consumption') ||
    normalizedUnit === 'w' ||
    normalizedUnit === 'kw' ||
    normalizedUnit === 'mw'
  ) {
    return 'zap';
  }

  if (
    deviceClass === 'voltage' ||
    normalizedSearch.includes('voltage') ||
    normalizedUnit === 'v' ||
    normalizedUnit === 'mv' ||
    normalizedUnit === 'kv'
  ) {
    return 'gauge';
  }

  if (
    deviceClass === 'temperature' ||
    normalizedSearch.includes('temperature') ||
    normalizedSearch.includes('temp') ||
    normalizedUnit.includes('c') ||
    normalizedUnit.includes('f')
  ) {
    return 'thermometer';
  }

  if (
    deviceClass === 'humidity' ||
    normalizedSearch.includes('humidity') ||
    normalizedUnit === '%'
  ) {
    return 'droplets';
  }

  if (
    deviceClass === 'current' ||
    deviceClass === 'energy' ||
    normalizedSearch.includes('current') ||
    normalizedSearch.includes('amp') ||
    normalizedSearch.includes('energy') ||
    normalizedUnit === 'a' ||
    normalizedUnit === 'ma' ||
    normalizedUnit === 'wh' ||
    normalizedUnit === 'kwh' ||
    normalizedUnit === 'mwh'
  ) {
    return 'activity';
  }

  return 'activity';
}

export function getMetricLabel(
  entityId: string,
  entity: { attributes?: Record<string, unknown> }
): string {
  const friendlyName =
    typeof entity.attributes?.friendly_name === 'string'
      ? entity.attributes.friendly_name.trim()
      : '';
  if (friendlyName) return friendlyName;
  return (
    entityId
      .split('.')
      .slice(-1)[0]
      ?.replace(/_/g, ' ')
      .replace(/\b\w/g, (char: string) => char.toUpperCase()) ?? entityId
  );
}

export function normalizeMetric(
  deviceClass: string | null,
  friendlyName: string,
  rawValue: number,
  unit: unknown
): { label: string; unit: string; value: number } | null {
  if (
    deviceClass === 'power' ||
    friendlyName.includes('power') ||
    unit === 'W' ||
    unit === 'kW' ||
    unit === 'MW'
  ) {
    return { label: 'Power', value: toWatts(rawValue, unit), unit: 'W' };
  }

  if (
    deviceClass === 'voltage' ||
    friendlyName.includes('voltage') ||
    unit === 'V' ||
    unit === 'mV' ||
    unit === 'kV'
  ) {
    return { label: 'Voltage', value: toVolts(rawValue, unit), unit: 'V' };
  }

  if (
    deviceClass === 'energy' ||
    friendlyName.includes('energy') ||
    unit === 'Wh' ||
    unit === 'kWh' ||
    unit === 'MWh'
  ) {
    return { label: 'Energy', value: toKilowattHours(rawValue, unit), unit: 'kWh' };
  }

  return null;
}

export function formatMetricNumber(value: number): string {
  return Number.isInteger(value) ? `${value}` : value.toFixed(1);
}

export interface SensorValueFormatOptions {
  locale?: string;
  use24HourTime?: boolean;
}

function getSensorDeviceClass(entity: { attributes?: Record<string, unknown> }): string | null {
  return typeof entity.attributes?.device_class === 'string'
    ? entity.attributes.device_class.toLowerCase()
    : null;
}

function formatNumericSensorValue(value: number, deviceClass: string | null): string {
  if (deviceClass === 'pressure') {
    return `${Math.round(value)}`;
  }

  return `${value}`;
}

export function formatSensorValue(
  entity: {
    state: unknown;
    attributes?: Record<string, unknown>;
  },
  options: SensorValueFormatOptions = {}
): { value: string; unit: string } | null {
  const unit =
    typeof entity.attributes?.unit_of_measurement === 'string'
      ? entity.attributes.unit_of_measurement
      : typeof entity.attributes?.native_unit_of_measurement === 'string'
        ? entity.attributes.native_unit_of_measurement
        : '';
  const deviceClass = getSensorDeviceClass(entity);

  const candidate =
    typeof entity.state === 'string' && entity.state.length > 0
      ? entity.state
      : typeof entity.attributes?.native_value === 'string' ||
          typeof entity.attributes?.native_value === 'number'
        ? String(entity.attributes.native_value)
        : typeof entity.attributes?.value === 'string' ||
            typeof entity.attributes?.value === 'number'
          ? String(entity.attributes.value)
          : '';

  if (!candidate) return null;
  if (deviceClass === 'timestamp') {
    return {
      value: formatTimestampTime(candidate, options.locale ?? 'en-US', options.use24HourTime),
      unit: '',
    };
  }

  const numericValue = Number(candidate);
  if (Number.isFinite(numericValue)) {
    return { value: formatNumericSensorValue(numericValue, deviceClass), unit };
  }

  return { value: candidate, unit };
}
