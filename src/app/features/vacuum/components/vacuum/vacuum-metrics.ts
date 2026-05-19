import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import type { HomeAssistantEntityRegistryEntry } from '@/app/services/home-assistant.service';

const NEXT_CLEANING_KEYS = [
  'next_cleaning',
  'next_clean',
  'scheduled_start',
  'next_run',
  'next_scheduled_clean',
  'next_cleaning_time',
];

const WATER_LEVEL_KEYS = [
  'water_level',
  'water_tank_level',
  'mop_water_level',
  'tank_level',
  'water',
];

const BIN_LEVEL_KEYS = [
  'bin_level',
  'dustbin_level',
  'dust_bin_level',
  'dust_level',
  'container_level',
  'bin_space',
  'bin_fullness',
];

const WATER_SENSOR_MATCHERS = ['water', 'tank', 'mop'];
const BIN_SENSOR_MATCHERS = ['bin', 'dustbin', 'dust bin', 'dust', 'container'];

export interface VacuumLevelMetric {
  value: string;
  percentage?: number;
  isWarning?: boolean;
}

export interface VacuumGlanceMetrics {
  battery: number;
  nextCleaning?: string;
  waterLevel?: VacuumLevelMetric;
  binLevel?: VacuumLevelMetric;
}

interface ResolveVacuumGlanceMetricsOptions {
  vacuumEntity?: HassEntity;
  vacuumEntityId: string;
  fallbackBattery: number;
  fallbackNextCleaning?: unknown;
  fallbackWaterLevel?: unknown;
  fallbackBinLevel?: unknown;
  use24HourTime?: boolean;
  entities?: HassEntities | null;
  entityRegistry?: HomeAssistantEntityRegistryEntry[];
}

function clampPercentage(value: number): number {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function parseNumberish(value: unknown): number | undefined {
  if (typeof value === 'number' && Number.isFinite(value)) return value;
  if (typeof value === 'string') {
    const parsed = Number.parseFloat(value);
    return Number.isFinite(parsed) ? parsed : undefined;
  }
  return undefined;
}

function readFirst(attrs: Record<string, unknown> | undefined, keys: string[]): unknown {
  if (!attrs) return undefined;

  for (const key of keys) {
    const value = attrs[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }

  return undefined;
}

function formatSchedule(value: unknown, use24HourTime = false): string | undefined {
  if (value instanceof Date && Number.isFinite(value.getTime())) {
    return formatDate(value, use24HourTime);
  }

  if (typeof value !== 'string' && typeof value !== 'number') return undefined;

  const raw = String(value).trim();
  if (raw.length === 0) return undefined;

  const parsedDate = new Date(raw);
  if (Number.isFinite(parsedDate.getTime())) {
    return formatDate(parsedDate, use24HourTime);
  }

  return raw;
}

function formatDate(date: Date, use24HourTime: boolean): string {
  return new Intl.DateTimeFormat(undefined, {
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hour12: !use24HourTime,
  }).format(date);
}

function normalizeLevelMetric(
  value: unknown,
  lowWarningThreshold = 20,
  highWarningThreshold?: number
): VacuumLevelMetric | undefined {
  const numeric = parseNumberish(value);

  if (typeof numeric === 'number') {
    const percentage = clampPercentage(numeric);
    return {
      value: `${percentage}%`,
      percentage,
      isWarning:
        percentage <= lowWarningThreshold ||
        (typeof highWarningThreshold === 'number' && percentage >= highWarningThreshold),
    };
  }

  if (typeof value !== 'string') return undefined;

  const normalized = value.trim();
  if (normalized.length === 0) return undefined;

  const lower = normalized.toLowerCase();
  if (lower === 'unknown' || lower === 'unavailable' || lower === 'none') return undefined;

  return {
    value: normalized,
    isWarning: ['low', 'empty', 'full', 'needs_emptying', 'problem'].includes(lower),
  };
}

function findRelatedSensorValue({
  vacuumEntityId,
  entities,
  entityRegistry,
  matchers,
}: {
  vacuumEntityId: string;
  entities?: HassEntities | null;
  entityRegistry?: HomeAssistantEntityRegistryEntry[];
  matchers: string[];
}): unknown {
  if (!entities || !entityRegistry?.length) return undefined;

  const vacuumRegistryEntry = entityRegistry.find((entry) => entry.entity_id === vacuumEntityId);
  const deviceId = vacuumRegistryEntry?.device_id;
  if (!deviceId) return undefined;

  const sensorEntries = entityRegistry.filter(
    (entry) => entry.device_id === deviceId && entry.entity_id.startsWith('sensor.')
  );

  for (const entry of sensorEntries) {
    const entity = entities[entry.entity_id];
    const searchable = [
      entry.entity_id,
      entry.name,
      entry.original_name,
      entity?.attributes?.friendly_name,
      entity?.attributes?.device_class,
    ]
      .filter((part): part is string => typeof part === 'string')
      .join(' ')
      .toLowerCase();

    if (matchers.some((matcher) => searchable.includes(matcher))) {
      return entity?.state ?? entity?.attributes?.value;
    }
  }

  return undefined;
}

export function resolveVacuumGlanceMetrics({
  vacuumEntity,
  vacuumEntityId,
  fallbackBattery,
  fallbackNextCleaning,
  fallbackWaterLevel,
  fallbackBinLevel,
  use24HourTime = false,
  entities,
  entityRegistry,
}: ResolveVacuumGlanceMetricsOptions): VacuumGlanceMetrics {
  const attrs = vacuumEntity?.attributes as Record<string, unknown> | undefined;
  const battery =
    parseNumberish(attrs?.battery_level) ??
    parseNumberish(attrs?.battery) ??
    parseNumberish(attrs?.battery_percent) ??
    fallbackBattery;
  const nextCleaning = formatSchedule(
    readFirst(attrs, NEXT_CLEANING_KEYS) ?? fallbackNextCleaning,
    use24HourTime
  );
  const waterLevel = normalizeLevelMetric(
    readFirst(attrs, WATER_LEVEL_KEYS) ??
      findRelatedSensorValue({
        vacuumEntityId,
        entities,
        entityRegistry,
        matchers: WATER_SENSOR_MATCHERS,
      }) ??
      fallbackWaterLevel
  );
  const binLevel = normalizeLevelMetric(
    readFirst(attrs, BIN_LEVEL_KEYS) ??
      findRelatedSensorValue({
        vacuumEntityId,
        entities,
        entityRegistry,
        matchers: BIN_SENSOR_MATCHERS,
      }) ??
      fallbackBinLevel,
    0,
    85
  );

  return {
    battery: clampPercentage(battery),
    nextCleaning,
    waterLevel,
    binLevel,
  };
}
