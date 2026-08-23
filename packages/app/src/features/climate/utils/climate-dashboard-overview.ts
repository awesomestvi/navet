import type { HomeStatusSummaryItem } from '@navet/app/features/sensors/components/home-status-summary-model';
import { defaultTranslate, type TranslateFn } from '@navet/app/i18n';
import type { DeviceWithType } from '@navet/app/types/device.types';
import {
  convertTemperatureUnitValue,
  formatDisplayTemperature,
  normalizeTemperatureUnit,
  type TemperatureUnit,
} from '@navet/app/utils/temperature';
import { CircleAlert, Fan, Thermometer } from 'lucide-react';

export interface ClimateDashboardAttentionItem {
  id: string;
  deviceId: string;
  title: string;
  detail: string;
  priority: 'critical' | 'attention';
  kind: 'unavailable' | 'temperature' | 'provider';
}

export interface ClimateDashboardOverview {
  summaryItems: HomeStatusSummaryItem[];
  attentionItems: ClimateDashboardAttentionItem[];
  temperatureRange: string | null;
  activeControlCount: number;
  unavailableCount: number;
}

function getFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value !== 'string' || value.trim() === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
}

function isUnavailable(device: DeviceWithType) {
  return (
    device.securitySeverity === 'unknown' ||
    (device.type === 'sensors' &&
      (device.status === 'unavailable' ||
        device.availability === 'unavailable' ||
        device.availability === 'unknown'))
  );
}

function isControlActive(device: DeviceWithType) {
  if (device.type === 'fans' || device.type === 'switches') return device.state;
  if (device.type !== 'climate' && device.type !== 'hvac') return false;

  const mode = device.mode?.trim().toLowerCase() ?? '';
  const action = device.action?.trim().toLowerCase();
  return (
    !['', 'off', 'idle', 'unavailable', 'unknown'].includes(mode) &&
    action !== 'idle' &&
    action !== 'off'
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

function getTemperatureAttention(
  device: DeviceWithType,
  displayUnit: TemperatureUnit,
  t: TranslateFn
): ClimateDashboardAttentionItem | null {
  if (device.type !== 'climate' && device.type !== 'hvac') return null;

  const current = getFiniteNumber(device.currentTemperature);
  const target = getFiniteNumber(device.temperature);
  const sourceUnit = normalizeTemperatureUnit(device.temperatureUnit) ?? 'celsius';
  const mode = device.mode?.trim().toLowerCase() ?? '';
  const allowedDeviation = sourceUnit === 'fahrenheit' ? 3.6 : 2;

  if (
    current === null ||
    target === null ||
    mode !== 'off' ||
    Math.abs(current - target) < allowedDeviation
  ) {
    return null;
  }

  const displayCurrent = convertTemperatureUnitValue(current, sourceUnit, displayUnit);
  const displayTarget = convertTemperatureUnitValue(target, sourceUnit, displayUnit);
  return {
    id: `climate-temperature:${device.id}`,
    deviceId: device.id,
    title: device.name,
    detail: `${t('climate.currentTemperature', {
      temp: `${formatDisplayTemperature(displayCurrent)}°`,
    })} · ${t('climate.target')} ${formatDisplayTemperature(displayTarget)}°`,
    priority: 'attention',
    kind: 'temperature',
  };
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
      detail: t('common.unavailable'),
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
          ? `${device.value}${device.unit ? ` ${device.unit}` : ''}`
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
  const attentionItems: ClimateDashboardAttentionItem[] = [];
  let activeControlCount = 0;
  let unavailableCount = 0;

  for (const device of devices) {
    const temperature = getTemperatureValue(device, displayUnit);
    if (temperature !== null) temperatureValues.push(temperature);
    if (isControlActive(device)) activeControlCount += 1;
    if (isUnavailable(device)) unavailableCount += 1;

    const providerAttention = getProviderAttention(device, t);
    if (providerAttention) {
      attentionItems.push(providerAttention);
      continue;
    }

    const temperatureAttention = getTemperatureAttention(device, displayUnit, t);
    if (temperatureAttention) attentionItems.push(temperatureAttention);
  }

  attentionItems.sort((left, right) => {
    if (left.priority !== right.priority) return left.priority === 'critical' ? -1 : 1;
    return left.title.localeCompare(right.title);
  });

  const temperatureRange = formatTemperatureRange(temperatureValues);
  const summaryItems: HomeStatusSummaryItem[] = [];
  if (temperatureRange) {
    summaryItems.push({
      id: 'climate-temperature-range',
      title: t('homeSummary.climate'),
      value: temperatureRange,
      icon: Thermometer,
      iconColor: '#22d3ee',
      tone: attentionItems.some((item) => item.kind === 'temperature') ? 'warning' : 'neutral',
      priority: attentionItems.some((item) => item.kind === 'temperature')
        ? 'attention'
        : 'current',
    });
  }
  summaryItems.push({
    id: 'climate-active-controls',
    title: t('tasks.summary.active'),
    value: String(activeControlCount),
    icon: Fan,
    iconColor: '#38bdf8',
    tone: activeControlCount > 0 ? 'active' : 'neutral',
  });
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
    activeControlCount,
    unavailableCount,
  };
}
