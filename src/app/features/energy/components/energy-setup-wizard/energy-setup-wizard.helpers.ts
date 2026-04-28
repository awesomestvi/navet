import { getMetricLabel } from '@/app/hooks/ha-entity-utils';
import type { EnergyDeviceSource, EnergySourceConfig } from '../../types/energy.types';
import type {
  EnergyEntityOption,
  EnergyEntityPickerPreset,
  EnergySetupDraft,
  EnergySetupFields,
} from './energy-setup-wizard.types';

type HassEntityLike = {
  entity_id?: string;
  state?: string;
  attributes?: Record<string, unknown>;
};

type EntityMap = Record<string, HassEntityLike>;
type MetricEntityArg = Parameters<typeof getMetricLabel>[1];

export const ENERGY_DEVICE_CATEGORY_OPTIONS: EnergyDeviceSource['category'][] = [
  'other',
  'hvac',
  'water_heater',
  'bathroom_heater',
  'toilet_heater',
  'floor_heating',
  'ev_charger',
  'washer',
  'dryer',
  'dishwasher',
];

export function createEmptyEnergySetupFields(): EnergySetupFields {
  return {
    solarPowerEntityId: '',
    batterySocEntityId: '',
    batteryPowerEntityId: '',
    gridImportPowerEntityId: '',
    gridExportPowerEntityId: '',
    homeLoadPowerEntityId: '',
    solarEnergyEntityId: '',
    gridImportEnergyEntityId: '',
    gridExportEnergyEntityId: '',
  };
}

function normalizeFieldValue(value: string | undefined): string {
  return value?.trim() ?? '';
}

export function createEnergySetupDraft(initialConfig?: EnergySourceConfig): EnergySetupDraft {
  const fields = createEmptyEnergySetupFields();
  const config = initialConfig ?? { devices: [] };

  fields.solarPowerEntityId = normalizeFieldValue(config.solarPowerEntityId);
  fields.batterySocEntityId = normalizeFieldValue(config.batterySocEntityId);
  fields.batteryPowerEntityId = normalizeFieldValue(config.batteryPowerEntityId);
  fields.gridImportPowerEntityId = normalizeFieldValue(config.gridImportPowerEntityId);
  fields.gridExportPowerEntityId = normalizeFieldValue(config.gridExportPowerEntityId);
  fields.homeLoadPowerEntityId = normalizeFieldValue(config.homeLoadPowerEntityId);
  fields.solarEnergyEntityId = normalizeFieldValue(config.solarEnergyEntityId);
  fields.gridImportEnergyEntityId = normalizeFieldValue(config.gridImportEnergyEntityId);
  fields.gridExportEnergyEntityId = normalizeFieldValue(config.gridExportEnergyEntityId);

  return {
    fields,
    solarEnabled: Boolean(fields.solarPowerEntityId || fields.solarEnergyEntityId),
    batteryEnabled: Boolean(fields.batterySocEntityId || fields.batteryPowerEntityId),
    devices: config.devices ?? [],
  };
}

function sanitizeOptionalField(value: string | undefined): string | undefined {
  if (!value) return undefined;
  const trimmed = value.trim();
  return trimmed.length > 0 ? trimmed : undefined;
}

export function buildConfigFromDraft(draft: EnergySetupDraft): EnergySourceConfig {
  return {
    homeLoadPowerEntityId: sanitizeOptionalField(draft.fields.homeLoadPowerEntityId),
    gridImportPowerEntityId: sanitizeOptionalField(draft.fields.gridImportPowerEntityId),
    gridImportEnergyEntityId: sanitizeOptionalField(draft.fields.gridImportEnergyEntityId),
    gridExportPowerEntityId: sanitizeOptionalField(draft.fields.gridExportPowerEntityId),
    gridExportEnergyEntityId: sanitizeOptionalField(draft.fields.gridExportEnergyEntityId),
    solarPowerEntityId: draft.solarEnabled
      ? sanitizeOptionalField(draft.fields.solarPowerEntityId)
      : undefined,
    solarEnergyEntityId: draft.solarEnabled
      ? sanitizeOptionalField(draft.fields.solarEnergyEntityId)
      : undefined,
    batterySocEntityId: draft.batteryEnabled
      ? sanitizeOptionalField(draft.fields.batterySocEntityId)
      : undefined,
    batteryPowerEntityId: draft.batteryEnabled
      ? sanitizeOptionalField(draft.fields.batteryPowerEntityId)
      : undefined,
    devices: draft.devices
      .map((device) => ({
        ...device,
        entityId: device.entityId.trim(),
        name: device.name.trim(),
        powerEntityId: sanitizeOptionalField(device.powerEntityId ?? ''),
      }))
      .filter((device) => device.entityId.length > 0 && device.name.length > 0),
  };
}

export function mergeDetectedConfigIntoDraft(
  previousDraft: EnergySetupDraft,
  detectedConfig: EnergySourceConfig
): EnergySetupDraft {
  const nextDraft = createEnergySetupDraft(detectedConfig);
  return {
    ...nextDraft,
    batteryEnabled: previousDraft.batteryEnabled || nextDraft.batteryEnabled,
  };
}

export function hasCompleteEssentials(draft: EnergySetupDraft): boolean {
  return Boolean(
    draft.fields.homeLoadPowerEntityId &&
      draft.fields.gridImportPowerEntityId &&
      draft.fields.gridImportEnergyEntityId
  );
}

export function getEnergyCategoryLabel(category: EnergyDeviceSource['category']): string {
  return category
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export function scoreEnergySetupDraft(draft: EnergySetupDraft): {
  score: number;
  label: string;
  tone: 'danger' | 'warning' | 'accent' | 'success';
} {
  let score = 0;

  if (draft.fields.homeLoadPowerEntityId) score += 20;
  if (draft.fields.gridImportPowerEntityId) score += 20;
  if (draft.fields.gridImportEnergyEntityId) score += 20;

  if (draft.solarEnabled) {
    score += 5;
    if (draft.fields.solarPowerEntityId) score += 5;
    if (draft.fields.solarEnergyEntityId) score += 5;
  }

  if (draft.batteryEnabled) {
    score += 5;
    if (draft.fields.batterySocEntityId) score += 5;
    if (draft.fields.batteryPowerEntityId) score += 5;
  }

  if (draft.devices.length > 0) {
    score += 10;
    if (draft.devices.some((device) => device.powerEntityId)) {
      score += 5;
    }
  }

  const normalizedScore = Math.max(0, Math.min(100, score));

  if (normalizedScore >= 85) {
    return { score: normalizedScore, label: 'Excellent', tone: 'success' };
  }
  if (normalizedScore >= 60) {
    return { score: normalizedScore, label: 'Strong', tone: 'accent' };
  }
  if (normalizedScore >= 35) {
    return { score: normalizedScore, label: 'Usable', tone: 'warning' };
  }
  return { score: normalizedScore, label: 'Needs setup', tone: 'danger' };
}

function getEntityUnit(entity: HassEntityLike): string {
  return String(
    entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement ?? ''
  )
    .trim()
    .toLowerCase();
}

function getEntityDeviceClass(entity: HassEntityLike): string {
  return String(entity.attributes?.device_class ?? '')
    .trim()
    .toLowerCase();
}

function getEntityStateClass(entity: HassEntityLike): string {
  return String(entity.attributes?.state_class ?? '')
    .trim()
    .toLowerCase();
}

function isPowerEntity(entityId: string, entity: HassEntityLike): boolean {
  if (!entityId.startsWith('sensor.')) {
    return false;
  }

  const unit = getEntityUnit(entity);
  const deviceClass = getEntityDeviceClass(entity);
  const haystack =
    `${entityId} ${getMetricLabel(entityId, entity as MetricEntityArg)}`.toLowerCase();

  return (
    deviceClass === 'power' ||
    unit === 'w' ||
    unit === 'kw' ||
    unit === 'mw' ||
    haystack.includes('power') ||
    haystack.includes('load') ||
    haystack.includes('demand')
  );
}

function isEnergyStatEntity(entityId: string, entity: HassEntityLike): boolean {
  if (!entityId.startsWith('sensor.')) {
    return false;
  }

  const unit = getEntityUnit(entity);
  const deviceClass = getEntityDeviceClass(entity);
  const stateClass = getEntityStateClass(entity);
  const haystack =
    `${entityId} ${getMetricLabel(entityId, entity as MetricEntityArg)}`.toLowerCase();

  return (
    deviceClass === 'energy' ||
    unit === 'wh' ||
    unit === 'kwh' ||
    unit === 'mwh' ||
    stateClass === 'total' ||
    stateClass === 'total_increasing' ||
    haystack.includes('energy') ||
    haystack.includes('consumed')
  );
}

function isBatterySocEntity(entityId: string, entity: HassEntityLike): boolean {
  if (!entityId.startsWith('sensor.')) {
    return false;
  }

  const unit = getEntityUnit(entity);
  const deviceClass = getEntityDeviceClass(entity);
  const haystack =
    `${entityId} ${getMetricLabel(entityId, entity as MetricEntityArg)}`.toLowerCase();

  return deviceClass === 'battery' || unit === '%' || haystack.includes('battery');
}

function matchesPreset(
  preset: EnergyEntityPickerPreset,
  entityId: string,
  entity: HassEntityLike
): boolean {
  if (preset === 'power') {
    return isPowerEntity(entityId, entity);
  }
  if (preset === 'battery-soc') {
    return isBatterySocEntity(entityId, entity);
  }
  return isEnergyStatEntity(entityId, entity);
}

export function buildEnergyEntityOptions(
  entities: EntityMap | null | undefined,
  preset: EnergyEntityPickerPreset
): EnergyEntityOption[] {
  if (!entities) {
    return [];
  }

  return Object.entries(entities)
    .filter(([entityId, entity]) => matchesPreset(preset, entityId, entity))
    .map(([entityId, entity]) => {
      const label = getMetricLabel(entityId, entity as MetricEntityArg);
      const unit = getEntityUnit(entity);
      const deviceClass = getEntityDeviceClass(entity);
      return {
        value: entityId,
        label,
        description: entityId,
        keywords: `${label} ${entityId} ${unit} ${deviceClass}`.toLowerCase(),
      };
    })
    .sort((left, right) => left.label.localeCompare(right.label));
}

export function filterEnergyEntityOptions(
  options: EnergyEntityOption[],
  query: string,
  limit = 24
): EnergyEntityOption[] {
  const normalizedQuery = query.trim().toLowerCase();
  const filtered = normalizedQuery
    ? options.filter((option) => option.keywords.includes(normalizedQuery))
    : options;

  return filtered.slice(0, limit);
}
