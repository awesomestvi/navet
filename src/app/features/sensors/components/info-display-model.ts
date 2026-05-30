import { formatTimestampTime } from '@/app/hooks/entity-utils/time-format';
import type { SensorDevice } from '@/app/types/device.types';
import type { SensorIconType } from './sensors';

export type InfoTone = 'neutral' | 'blue' | 'green' | 'amber' | 'red' | 'teal';

export interface InfoDisplayModel {
  id: string;
  title: string;
  eyebrow: string;
  value: string;
  unit: string;
  icon: SensorIconType;
  tone: InfoTone;
  baseColor: string;
  status: SensorDevice['status'];
  deviceClass?: string;
}

export interface InfoDisplayFormatOptions {
  locale?: string;
  use24HourTime?: boolean;
}

export const INFO_TONE_CLASSES: Record<InfoTone, { value: string; baseColor: string }> = {
  amber: {
    value: 'text-amber-300',
    baseColor: '#f59e0b',
  },
  blue: {
    value: 'text-sky-300',
    baseColor: '#0ea5e9',
  },
  green: {
    value: 'text-emerald-300',
    baseColor: '#10b981',
  },
  neutral: {
    value: 'text-white/72',
    baseColor: '#94a3b8',
  },
  red: {
    value: 'text-red-300',
    baseColor: '#f87171',
  },
  teal: {
    value: 'text-teal-300',
    baseColor: '#2dd4bf',
  },
};

const SAFETY_CLASSES = new Set(['gas', 'moisture', 'problem', 'safety', 'smoke', 'tamper']);
const OPEN_STATE_CLASSES = new Set([
  'door',
  'garage_door',
  'motion',
  'occupancy',
  'opening',
  'presence',
  'window',
]);

export function getInfoTone(
  deviceClass: string | undefined,
  status: SensorDevice['status']
): InfoTone {
  if (status === 'unavailable') {
    return 'neutral';
  }

  if (status === 'active') {
    if (deviceClass && SAFETY_CLASSES.has(deviceClass)) {
      return 'red';
    }
    if (deviceClass && OPEN_STATE_CLASSES.has(deviceClass)) {
      return 'amber';
    }
    return 'blue';
  }

  if (status === 'clear') {
    return 'green';
  }

  switch (deviceClass) {
    case 'carbon_dioxide':
    case 'carbon_monoxide':
    case 'pm1':
    case 'pm10':
    case 'pm25':
    case 'volatile_organic_compounds':
      return 'green';
    case 'energy':
    case 'power':
      return 'amber';
    case 'humidity':
    case 'moisture':
      return 'blue';
    case 'temperature':
      return 'red';
    default:
      return 'teal';
  }
}

function normalizeDeviceClass(deviceClass: string | undefined) {
  return deviceClass?.toLowerCase();
}

function formatCardTypeLabel(value: string | undefined) {
  return value
    ?.replace(/_/g, ' ')
    .trim()
    .replace(/\S+/g, (word) => word.charAt(0).toUpperCase() + word.slice(1));
}

function formatPressureValue(value: string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(1);
}

function formatTemperatureValue(value: string) {
  const numericValue = Number(value);
  if (!Number.isFinite(numericValue)) {
    return value;
  }

  return Number.isInteger(numericValue) ? `${numericValue}` : numericValue.toFixed(1);
}

function formatSensorDisplayValue(
  sensor: SensorDevice,
  deviceClass: string | undefined,
  options: InfoDisplayFormatOptions
) {
  if (deviceClass === 'timestamp') {
    return formatTimestampTime(
      sensor.value,
      options.locale ??
        (typeof navigator !== 'undefined' && navigator.language ? navigator.language : 'en-US'),
      options.use24HourTime ?? false
    );
  }

  if (deviceClass === 'pressure') {
    return formatPressureValue(sensor.value);
  }

  if (deviceClass === 'temperature') {
    return formatTemperatureValue(sensor.value);
  }

  return sensor.value;
}

export function buildInfoDisplayModel(
  sensor: SensorDevice,
  options: InfoDisplayFormatOptions = {}
): InfoDisplayModel {
  const deviceClass = normalizeDeviceClass(sensor.deviceClass);
  const status = sensor.status ?? 'measurement';
  const tone = getInfoTone(deviceClass, status);
  const toneClasses = INFO_TONE_CLASSES[tone];

  return {
    id: sensor.id,
    title: sensor.name,
    eyebrow: formatCardTypeLabel(sensor.entityType) || formatCardTypeLabel(deviceClass) || 'Info',
    value: formatSensorDisplayValue(sensor, deviceClass, options),
    unit: sensor.unit,
    icon: sensor.icon ?? 'gauge',
    tone,
    baseColor: toneClasses.baseColor,
    status,
    deviceClass,
  };
}
