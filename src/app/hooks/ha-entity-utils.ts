import type { HassEntity } from 'home-assistant-js-websocket';
import type { TranslationKey } from '../i18n';
import type { DeviceMetric } from '../types/device.types';
import { UNKNOWN_ROOM_LABEL } from '../utils/device-location';

type TFunc = (key: TranslationKey, values?: Record<string, string | number>) => string;

const timeFormatterByLocale = new Map<string, Intl.DateTimeFormat>();

function getTimeFormatter(locale: string, use24HourTime = false): Intl.DateTimeFormat {
  const formatterKey = `${locale}:${use24HourTime ? '24' : '12'}`;
  const existing = timeFormatterByLocale.get(formatterKey);
  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24HourTime,
  });
  timeFormatterByLocale.set(formatterKey, formatter);
  return formatter;
}

// --- Numeric utilities ---

export function parseNumberish(value: unknown): number | null {
  if (typeof value === 'number' && !Number.isNaN(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    if (!Number.isNaN(parsed)) return parsed;
  }
  return null;
}

export function parseRoundedNumberish(value: unknown): number | null {
  const parsed = parseNumberish(value);
  return parsed === null ? null : Math.round(parsed);
}

export function toWatts(value: number, unit: unknown): number {
  if (typeof unit !== 'string') return value;
  switch (unit.toLowerCase()) {
    case 'kw':
      return value * 1000;
    case 'mw':
      return value * 1000000;
    default:
      return value;
  }
}

export function toVolts(value: number, unit: unknown): number {
  if (typeof unit !== 'string') return value;
  switch (unit.toLowerCase()) {
    case 'mv':
      return value / 1000;
    case 'kv':
      return value * 1000;
    default:
      return value;
  }
}

export function toKilowattHours(value: number, unit: unknown): number {
  if (typeof unit !== 'string') return value;
  switch (unit.toLowerCase()) {
    case 'wh':
      return value / 1000;
    case 'mwh':
      return value * 1000;
    default:
      return value;
  }
}

// --- Light attribute parsing ---

export function brightnessToPercent(entityId: string, entity: HassEntity): number {
  const brightnessPct = entity.attributes?.brightness_pct;
  if (typeof brightnessPct === 'number' && !Number.isNaN(brightnessPct)) {
    return Math.max(0, Math.min(100, Math.round(brightnessPct)));
  }

  const brightness = entity.attributes?.brightness;
  if (typeof brightness === 'number' && !Number.isNaN(brightness)) {
    return Math.max(0, Math.min(100, Math.round((brightness / 255) * 100)));
  }

  if (typeof brightnessPct === 'string') {
    const parsedBrightnessPct = Number.parseFloat(brightnessPct);
    if (!Number.isNaN(parsedBrightnessPct)) {
      return Math.max(0, Math.min(100, Math.round(parsedBrightnessPct)));
    }
  }

  if (typeof brightness === 'string') {
    const parsedBrightness = Number.parseFloat(brightness);
    if (!Number.isNaN(parsedBrightness)) {
      return Math.max(0, Math.min(100, Math.round((parsedBrightness / 255) * 100)));
    }
  }

  if (import.meta.env.DEV && entity.state === 'on') {
    console.debug('[Navet] Light missing brightness attributes', {
      entityId,
      attributes: entity.attributes,
    });
  }

  // Some integrations expose on/off without a brightness attribute.
  return entity.state === 'on' ? 100 : 0;
}

export function normalizeKelvin(entity: HassEntity): number {
  const kelvin = entity.attributes?.color_temp_kelvin;
  if (typeof kelvin === 'number' && !Number.isNaN(kelvin)) return Math.round(kelvin);
  const mired = entity.attributes?.color_temp;
  if (typeof mired === 'number' && mired > 0) return Math.round(1000000 / mired);
  return 4000;
}

// --- Entity name and room ---

export function getName(entity: HassEntity): string {
  return entity.attributes?.friendly_name || entity.entity_id;
}

export function resolveEntityRoom(
  entityId: string,
  entity: HassEntity,
  areaMap: Map<string, string>,
  entityRegistryMap: Map<string, { area_id?: string | null; device_id?: string | null }>,
  deviceRegistryMap: Map<string, { area_id?: string | null }>
): string {
  const entityEntry = entityRegistryMap.get(entityId);
  const deviceEntry = entityEntry?.device_id
    ? deviceRegistryMap.get(entityEntry.device_id)
    : undefined;
  const areaId = entityEntry?.area_id ?? deviceEntry?.area_id;

  if (areaId) {
    const areaName = areaMap.get(areaId);
    if (areaName) return areaName;
  }

  return (
    entity.attributes?.room ||
    entity.attributes?.area ||
    entity.attributes?.zone ||
    UNKNOWN_ROOM_LABEL
  );
}

// --- Weather and clock formatting ---

export function formatClock(value: unknown, locale: string, use24HourTime = false): string {
  if (typeof value !== 'string' || !value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return getTimeFormatter(locale, use24HourTime).format(date);
}

export function formatDaylight(sunrise: unknown, sunset: unknown): string {
  if (typeof sunrise !== 'string' || typeof sunset !== 'string') return '--';
  const sunriseDate = new Date(sunrise);
  const sunsetDate = new Date(sunset);
  if (Number.isNaN(sunriseDate.getTime()) || Number.isNaN(sunsetDate.getTime())) return '--';
  const diffMs = Math.max(0, sunsetDate.getTime() - sunriseDate.getTime());
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.round((diffMs % 3_600_000) / 60_000);
  return `${hours} h ${minutes} m`;
}

// --- Calendar utilities ---

export function parseCalendarDate(value: unknown): Date | null {
  if (typeof value === 'string' && value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const raw = record.dateTime ?? record.date;
    if (typeof raw === 'string' && raw) {
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

export function isAllDayCalendarValue(value: unknown): boolean {
  if (typeof value === 'string' && value) return /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return typeof record.date === 'string' && record.date.length > 0;
  }
  return false;
}

export function formatCalendarTime(
  date: Date | null,
  locale: string,
  use24HourTime = false
): string {
  if (!date) return '--';
  return getTimeFormatter(locale, use24HourTime).format(date);
}

export function inferCalendarEventType(title: string, location?: string) {
  const searchText = `${title} ${location ?? ''}`.toLowerCase();

  if (
    searchText.includes('zoom') ||
    searchText.includes('meet') ||
    searchText.includes('teams') ||
    searchText.includes('call') ||
    searchText.includes('video')
  ) {
    return 'call' as const;
  }

  if (
    searchText.includes('meeting') ||
    searchText.includes('standup') ||
    searchText.includes('review') ||
    searchText.includes('sync')
  ) {
    return 'meeting' as const;
  }

  return 'event' as const;
}

// --- Metric and sensor utilities ---

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

export function getMetricLabel(entityId: string, entity: HassEntity): string {
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

export function formatSensorValue(entity: HassEntity): { value: string; unit: string } | null {
  const unit =
    typeof entity.attributes?.unit_of_measurement === 'string'
      ? entity.attributes.unit_of_measurement
      : typeof entity.attributes?.native_unit_of_measurement === 'string'
        ? entity.attributes.native_unit_of_measurement
        : '';

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
  return { value: candidate, unit };
}

// --- i18n-dependent formatters ---

export function formatEntityType(deviceClass: unknown, fallback: string, t: TFunc): string {
  if (typeof deviceClass === 'string' && deviceClass.trim()) {
    const normalized = deviceClass.trim().toLowerCase();
    if (normalized === 'outlet') return t('lighting.type.outlet');
    if (normalized === 'switch') return t('lighting.type.switch');
    return deviceClass
      .trim()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (char) => char.toUpperCase());
  }
  return fallback;
}

export function formatMediaEntityType(deviceClass: unknown, t: TFunc): string {
  if (typeof deviceClass !== 'string' || !deviceClass.trim()) return t('media.type.player');
  const normalized = deviceClass.trim().toLowerCase();
  switch (normalized) {
    case 'tv':
    case 'television':
      return t('media.type.tv');
    case 'speaker':
      return t('media.type.speaker');
    case 'receiver':
      return t('media.type.receiver');
    case 'set_top_box':
      return t('media.type.setTopBox');
    case 'streaming_box':
      return t('media.type.streamingBox');
    case 'soundbar':
      return t('media.type.soundbar');
    default:
      return deviceClass
        .trim()
        .replace(/_/g, ' ')
        .replace(/\b\w/g, (char) => char.toUpperCase());
  }
}

export function helperLabelForDomain(domain: string, t: TFunc): string {
  switch (domain) {
    case 'script':
      return t('deviceType.script');
    case 'input_boolean':
      return t('deviceType.helper');
    case 'input_number':
    case 'input_select':
    case 'input_text':
    case 'input_datetime':
    case 'button':
    case 'input_button':
      return t('deviceType.helper');
    default:
      return t('deviceType.sensor');
  }
}
