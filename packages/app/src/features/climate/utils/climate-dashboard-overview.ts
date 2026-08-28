import type { HomeStatusSummaryItem } from '@navet/app/features/sensors/components/home-status-summary-model';
import { defaultTranslate, type TranslateFn } from '@navet/app/i18n';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import {
  convertTemperatureUnitValue,
  formatDisplayTemperature,
  normalizeTemperatureUnit,
  type TemperatureUnit,
} from '@navet/app/utils/temperature';
import { CircleAlert, CloudSun, Droplets, Fan, Thermometer } from 'lucide-react';

export interface ClimateDashboardAttentionItem {
  id: string;
  deviceId: string;
  title: string;
  detail: string;
  priority: 'critical' | 'attention';
  kind: 'unavailable' | 'provider';
}

export interface ClimateDashboardOverview {
  summaryItems: HomeStatusSummaryItem[];
  attentionItems: ClimateDashboardAttentionItem[];
  temperatureRange: string | null;
  temperatureRoomCount: number;
  averageHumidity: number | null;
  humidityRoomCount: number;
  outdoorTemperature: string | null;
  outdoorFeelsLike: string | null;
  comfortableRoomCount: number;
  comparableRoomCount: number;
  activeControlCount: number;
  unavailableCount: number;
}

const NON_AMBIENT_TEMPERATURE_PATTERN =
  /\b(boiler|water_heater|water heater|hot water|tank|cylinder|supply|return|flow temp|outside|outdoor|exterior|weather|processor|cpu|system monitor|system_monitor|device temperature|internal)\b/;

function getFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUnavailable(device: DeviceWithType) {
  if (device.type === 'climate' || device.type === 'hvac') {
    return ['unknown', 'unavailable'].includes(device.mode?.trim().toLowerCase() ?? '');
  }

  return (
    device.type === 'sensors' &&
    (device.status === 'unavailable' ||
      device.availability === 'unavailable' ||
      device.availability === 'unknown')
  );
}

function isControlActive(device: DeviceWithType) {
  if (device.type === 'fans' || device.type === 'switches') return device.state;
  if (device.type !== 'climate' && device.type !== 'hvac') return false;

  const mode = device.mode?.trim().toLowerCase() ?? '';
  const action = device.action?.trim().toLowerCase();
  return (
    !['', 'off', 'idle', 'unavailable', 'unknown'].includes(mode) &&
    Boolean(action) &&
    action !== 'idle' &&
    action !== 'off' &&
    action !== 'unavailable' &&
    action !== 'unknown'
  );
}

function getTemperatureValue(device: DeviceWithType, displayUnit: TemperatureUnit): number | null {
  if (device.type === 'climate' || device.type === 'hvac') {
    if (device.hasCurrentTemperature === false) return null;
    const value = getFiniteNumber(device.currentTemperature);
    if (value === null) return null;
    return convertTemperatureUnitValue(
      value,
      normalizeTemperatureUnit(device.temperatureUnit) ?? 'celsius',
      displayUnit
    );
  }

  if (
    device.type === 'sensors' &&
    String(device.deviceClass ?? '').toLowerCase() === 'temperature'
  ) {
    const identity = `${device.id} ${device.name}`.toLowerCase();
    if (NON_AMBIENT_TEMPERATURE_PATTERN.test(identity)) return null;

    const value = getFiniteNumber(device.value);
    if (value === null) return null;
    return convertTemperatureUnitValue(
      value,
      normalizeTemperatureUnit(device.unit) ?? (value > 45 ? 'fahrenheit' : 'celsius'),
      displayUnit
    );
  }

  return null;
}

function getHumidityValue(device: DeviceWithType): number | null {
  if (device.type !== 'sensors' || String(device.deviceClass ?? '').toLowerCase() !== 'humidity') {
    return null;
  }

  const value = getFiniteNumber(device.value);
  return value !== null && value >= 0 && value <= 100 ? value : null;
}

function getOutdoorTemperature(
  device: DeviceWithType,
  displayUnit: TemperatureUnit
): string | null {
  if (device.type !== 'weather') return null;

  const value = getFiniteNumber(device.temperature);
  if (value === null) return null;
  const converted = convertTemperatureUnitValue(
    value,
    normalizeTemperatureUnit(device.temperatureUnit) ?? 'celsius',
    displayUnit
  );
  return `${formatDisplayTemperature(converted)}°`;
}

function getOutdoorFeelsLike(device: DeviceWithType, displayUnit: TemperatureUnit): string | null {
  if (device.type !== 'weather') return null;

  const value = getFiniteNumber(device.feelsLikeTemperature);
  if (value === null) return null;
  const converted = convertTemperatureUnitValue(
    value,
    normalizeTemperatureUnit(device.feelsLikeTemperatureUnit) ??
      normalizeTemperatureUnit(device.temperatureUnit) ??
      'celsius',
    displayUnit
  );
  return `${formatDisplayTemperature(converted)}°`;
}

function getRoomComfort(device: DeviceWithType): boolean | null {
  if (device.type !== 'climate' && device.type !== 'hvac') return null;
  if (isUnavailable(device)) return false;

  const mode = device.mode?.trim().toLowerCase() ?? '';
  if (mode === 'off') return null;

  const current = getFiniteNumber(device.currentTemperature);
  const target = getFiniteNumber(device.temperature);
  if (current === null || target === null) return null;

  const sourceUnit = normalizeTemperatureUnit(device.temperatureUnit) ?? 'celsius';
  const allowedDeviation = sourceUnit === 'fahrenheit' ? 3.6 : 2;
  return Math.abs(current - target) < allowedDeviation;
}

function getProviderAttention(
  device: DeviceWithType,
  t: TranslateFn
): ClimateDashboardAttentionItem | null {
  if (isUnavailable(device)) {
    return {
      id: `climate-unavailable:${device.id}`,
      deviceId: device.id,
      title: device.name,
      detail: `${getDeviceRoomLabel(device)} · ${t('common.unavailable')}`,
      priority: 'attention',
      kind: 'unavailable',
    };
  }

  if (device.securitySeverity === 'critical' || device.securitySeverity === 'warning') {
    return {
      id: `climate-provider:${device.id}`,
      deviceId: device.id,
      title: device.name,
      detail:
        device.type === 'sensors' && device.value?.trim()
          ? `${getDeviceRoomLabel(device)} · ${device.value}${device.unit ? ` ${device.unit}` : ''}`
          : t('tasks.filters.attention'),
      priority: device.securitySeverity === 'critical' ? 'critical' : 'attention',
      kind: 'provider',
    };
  }

  return null;
}

function formatTemperatureRange(values: number[]) {
  if (values.length === 0) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  return min === max
    ? `${formatDisplayTemperature(min)}°`
    : `${formatDisplayTemperature(min)}–${formatDisplayTemperature(max)}°`;
}

export function buildClimateDashboardOverview(
  devices: Iterable<DeviceWithType>,
  displayUnit: TemperatureUnit,
  t: TranslateFn = defaultTranslate
): ClimateDashboardOverview {
  const temperatureValues: number[] = [];
  const temperatureRooms = new Set<string>();
  const humidityValues: number[] = [];
  const humidityRooms = new Set<string>();
  const roomComfort = new Map<string, boolean>();
  const attentionItems: ClimateDashboardAttentionItem[] = [];
  let activeControlCount = 0;
  let unavailableCount = 0;
  let outdoorTemperature: string | null = null;
  let outdoorFeelsLike: string | null = null;

  for (const device of devices) {
    const temperature = getTemperatureValue(device, displayUnit);
    if (temperature !== null) {
      temperatureValues.push(temperature);
      temperatureRooms.add(getDeviceRoomLabel(device));
    }
    const humidity = getHumidityValue(device);
    if (humidity !== null) {
      humidityValues.push(humidity);
      humidityRooms.add(getDeviceRoomLabel(device));
    }
    outdoorTemperature ??= getOutdoorTemperature(device, displayUnit);
    outdoorFeelsLike ??= getOutdoorFeelsLike(device, displayUnit);
    const comfortable = getRoomComfort(device);
    if (comfortable !== null) {
      const room = getDeviceRoomLabel(device);
      roomComfort.set(room, (roomComfort.get(room) ?? true) && comfortable);
    }
    if (isControlActive(device)) activeControlCount += 1;
    if (isUnavailable(device)) unavailableCount += 1;

    const providerAttention = getProviderAttention(device, t);
    if (providerAttention) {
      attentionItems.push(providerAttention);
    }
  }

  attentionItems.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority === 'critical' ? -1 : 1;
    return left.title.localeCompare(right.title);
  });

  const temperatureRange = formatTemperatureRange(temperatureValues);
  const averageHumidity =
    humidityValues.length > 0
      ? Math.round(humidityValues.reduce((sum, value) => sum + value, 0) / humidityValues.length)
      : null;
  const comparableRoomCount = roomComfort.size;
  const comfortableRoomCount = [...roomComfort.values()].filter(Boolean).length;
  const hasCriticalAttention = attentionItems.some((item) => item.priority === 'critical');
  const summaryItems: HomeStatusSummaryItem[] = [];
  summaryItems.push({
    id: 'climate-overall',
    title: t('homeSummary.climate'),
    value:
      attentionItems.length > 0 ? attentionItems[0].title : t('dashboard.packs.section.comfort'),
    icon: Thermometer,
    iconColor: hasCriticalAttention ? '#f87171' : attentionItems.length > 0 ? '#f59e0b' : '#22c55e',
    tone: hasCriticalAttention ? 'danger' : attentionItems.length > 0 ? 'warning' : 'neutral',
    priority: hasCriticalAttention
      ? 'critical'
      : attentionItems.length > 0
        ? 'attention'
        : 'current',
  });
  if (temperatureRange) {
    summaryItems.push({
      id: 'climate-temperature-range',
      title: t('sections.climate.temperature.title'),
      value: temperatureRange,
      icon: Thermometer,
      iconColor: '#22d3ee',
      tone: 'neutral',
      priority: 'current',
    });
  }
  if (activeControlCount > 0) {
    summaryItems.push({
      id: 'climate-active-controls',
      title: t('tasks.summary.active'),
      value: String(activeControlCount),
      icon: Fan,
      iconColor: '#38bdf8',
      tone: 'neutral',
    });
  }
  if (averageHumidity !== null) {
    summaryItems.push({
      id: 'climate-humidity',
      title: t('sections.climate.humidity.title'),
      value: `${averageHumidity}%`,
      icon: Droplets,
      iconColor: '#2dd4bf',
      tone: 'neutral',
    });
  }
  if (outdoorTemperature) {
    summaryItems.push({
      id: 'climate-outdoor',
      title: t('weather.subtitle'),
      value: outdoorTemperature,
      icon: CloudSun,
      iconColor: '#60a5fa',
      tone: 'neutral',
    });
  }
  if (unavailableCount > 0) {
    summaryItems.push({
      id: 'climate-unavailable',
      title: t('common.unavailable'),
      value: String(unavailableCount),
      icon: CircleAlert,
      iconColor: '#f59e0b',
      priority: 'attention',
      tone: 'warning',
    });
  }

  return {
    summaryItems,
    attentionItems,
    temperatureRange,
    temperatureRoomCount: temperatureRooms.size,
    averageHumidity,
    humidityRoomCount: humidityRooms.size,
    outdoorTemperature,
    outdoorFeelsLike,
    comfortableRoomCount,
    comparableRoomCount,
    activeControlCount,
    unavailableCount,
  };
}
