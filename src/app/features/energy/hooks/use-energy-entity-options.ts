import type { HassEntity } from 'home-assistant-js-websocket';
import { useHomeAssistant } from '@/app/hooks';
import { getMetricLabel } from '@/app/hooks/ha-entity-utils';
import type { HomeAssistantStore } from '@/app/stores/home-assistant-store';
import type { EnergyEntityOption } from '../components/energy-setup-wizard/energy-setup-wizard.types';

type EntityMap = Record<string, HassEntity>;
type EnergyEntityPickerPreset = 'power' | 'energy-stat' | 'battery-soc';

export interface EnergyUsageSensorOption {
  currentPowerW: number;
  id: string;
  name: string;
  todayUsageKWh: number;
  trendEntityId: string;
}

interface EnergyEntityOptionsSnapshot {
  batteryOptions: EnergyEntityOption[];
  energyStatOptions: EnergyEntityOption[];
  powerOptions: EnergyEntityOption[];
}

interface InferredHomeLoadCandidate {
  entityId?: string;
  watts: number;
}

function getEntityUnit(entity: HassEntity): string {
  return String(
    entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement ?? ''
  )
    .trim()
    .toLowerCase();
}

function getEntityDeviceClass(entity: HassEntity): string {
  return String(entity.attributes?.device_class ?? '')
    .trim()
    .toLowerCase();
}

function getEntityStateClass(entity: HassEntity): string {
  return String(entity.attributes?.state_class ?? '')
    .trim()
    .toLowerCase();
}

function getEntityLabel(entityId: string, entity: HassEntity): string {
  const label = getMetricLabel(entityId, entity);
  return label.trim() || entityId;
}

function parsePowerEntityWatts(entity: HassEntity | undefined): number | null {
  if (!entity) {
    return null;
  }

  const raw = Number.parseFloat(String(entity.state));
  if (!Number.isFinite(raw)) {
    return null;
  }

  const unit = String(
    entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement ?? ''
  )
    .trim()
    .toUpperCase();

  if (unit === 'W') {
    return raw;
  }
  if (unit === 'KW') {
    return raw * 1000;
  }

  return getEntityDeviceClass(entity) === 'power' ? raw : null;
}

function parseEnergyEntityKWh(entity: HassEntity | undefined): number | null {
  if (!entity) {
    return null;
  }

  const raw = Number.parseFloat(String(entity.state));
  if (!Number.isFinite(raw)) {
    return null;
  }

  const unit = String(
    entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement ?? ''
  )
    .trim()
    .toUpperCase();

  if (unit === 'KWH') {
    return raw;
  }
  if (unit === 'WH') {
    return raw / 1000;
  }
  if (unit === 'MWH') {
    return raw * 1000;
  }

  return getEntityDeviceClass(entity) === 'energy' ? raw : null;
}

function isPowerEntity(entityId: string, entity: HassEntity): boolean {
  if (!entityId.startsWith('sensor.')) {
    return false;
  }

  const unit = getEntityUnit(entity);
  const deviceClass = getEntityDeviceClass(entity);
  const haystack = `${entityId} ${getEntityLabel(entityId, entity)}`.toLowerCase();

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

function isEnergyStatEntity(entityId: string, entity: HassEntity): boolean {
  if (!entityId.startsWith('sensor.')) {
    return false;
  }

  const unit = getEntityUnit(entity);
  const deviceClass = getEntityDeviceClass(entity);
  const stateClass = getEntityStateClass(entity);
  const haystack = `${entityId} ${getEntityLabel(entityId, entity)}`.toLowerCase();

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

function isBatterySocEntity(entityId: string, entity: HassEntity): boolean {
  if (!entityId.startsWith('sensor.')) {
    return false;
  }

  const unit = getEntityUnit(entity);
  const deviceClass = getEntityDeviceClass(entity);
  const haystack = `${entityId} ${getEntityLabel(entityId, entity)}`.toLowerCase();

  return deviceClass === 'battery' || unit === '%' || haystack.includes('battery');
}

function matchesPreset(
  preset: EnergyEntityPickerPreset,
  entityId: string,
  entity: HassEntity
): boolean {
  if (preset === 'power') {
    return isPowerEntity(entityId, entity);
  }
  if (preset === 'battery-soc') {
    return isBatterySocEntity(entityId, entity);
  }
  return isEnergyStatEntity(entityId, entity);
}

function buildEnergyEntityOptions(
  entities: EntityMap | null | undefined,
  preset: EnergyEntityPickerPreset
): EnergyEntityOption[] {
  if (!entities) {
    return [];
  }

  return Object.entries(entities)
    .filter(([entityId, entity]) => matchesPreset(preset, entityId, entity))
    .map(([entityId, entity]) => {
      const label = getEntityLabel(entityId, entity);
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

function optionsEqual(a: EnergyEntityOption[], b: EnergyEntityOption[]): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }

  return a.every(
    (option, index) =>
      option.value === b[index]?.value &&
      option.label === b[index]?.label &&
      option.description === b[index]?.description &&
      option.keywords === b[index]?.keywords
  );
}

function energyEntityOptionsSnapshotEqual(
  a: EnergyEntityOptionsSnapshot,
  b: EnergyEntityOptionsSnapshot
): boolean {
  return (
    optionsEqual(a.powerOptions, b.powerOptions) &&
    optionsEqual(a.energyStatOptions, b.energyStatOptions) &&
    optionsEqual(a.batteryOptions, b.batteryOptions)
  );
}

function inferRelatedPowerEntityId(entityId: string, entities: EntityMap): string | undefined {
  const candidates = [
    entityId.replace('_energy_usage', '_power_usage'),
    entityId.replace('_energy_usage', '_power_consumed'),
    entityId.replace('_energy_usage', '_power'),
    entityId.replace('_energy_usage', '_power_now'),
    entityId.replace('_energy_usage', '_current_power'),
  ];

  for (const candidate of candidates) {
    if (candidate === entityId) {
      continue;
    }

    if (parsePowerEntityWatts(entities[candidate]) !== null) {
      return candidate;
    }
  }

  return parsePowerEntityWatts(entities[entityId]) !== null ? entityId : undefined;
}

function buildEnergyUsageSensorOptions(
  entities: EntityMap | null | undefined
): EnergyUsageSensorOption[] {
  if (!entities) {
    return [];
  }

  return Object.entries(entities)
    .filter(([entityId, entity]) => {
      if (!entityId.startsWith('sensor.')) {
        return false;
      }

      const friendlyName = getEntityLabel(entityId, entity).toLowerCase();
      const haystack = `${entityId} ${friendlyName}`;

      return (
        entityId === 'sensor.power_consumed' ||
        haystack.includes('_energy_usage') ||
        haystack.includes(' energy usage')
      );
    })
    .map(([entityId, entity]) => {
      const trendEntityId = inferRelatedPowerEntityId(entityId, entities) ?? entityId;
      return {
        id: `entity:${entityId}`,
        name: getEntityLabel(entityId, entity),
        currentPowerW: parsePowerEntityWatts(entities[trendEntityId]) ?? 0,
        todayUsageKWh: parseEnergyEntityKWh(entity) ?? 0,
        trendEntityId,
      };
    })
    .filter((option) => option.todayUsageKWh > 0 || option.currentPowerW > 0)
    .sort((left, right) =>
      right.todayUsageKWh === left.todayUsageKWh
        ? right.currentPowerW - left.currentPowerW
        : right.todayUsageKWh - left.todayUsageKWh
    );
}

function energyUsageSensorOptionsEqual(
  a: EnergyUsageSensorOption[],
  b: EnergyUsageSensorOption[]
): boolean {
  if (a === b) {
    return true;
  }
  if (a.length !== b.length) {
    return false;
  }

  return a.every(
    (option, index) =>
      option.id === b[index]?.id &&
      option.name === b[index]?.name &&
      option.currentPowerW === b[index]?.currentPowerW &&
      option.todayUsageKWh === b[index]?.todayUsageKWh &&
      option.trendEntityId === b[index]?.trendEntityId
  );
}

function parseW(state: string | undefined): number {
  const parsed = Number.parseFloat(state ?? '');
  return Number.isFinite(parsed) ? parsed : 0;
}

function inferHomeLoadPowerSensor(
  entities: EntityMap | null | undefined
): InferredHomeLoadCandidate {
  if (!entities) {
    return { entityId: undefined, watts: 0 };
  }

  const candidates = Object.entries(entities)
    .filter(([entityId, entity]) => {
      if (!entityId.startsWith('sensor.')) {
        return false;
      }

      const unit = String(
        entity.attributes?.unit_of_measurement ??
          entity.attributes?.native_unit_of_measurement ??
          ''
      ).toUpperCase();
      return getEntityDeviceClass(entity) === 'power' && unit === 'W';
    })
    .map(([entityId, entity]) => {
      const friendlyName = String(entity.attributes?.friendly_name ?? '').toLowerCase();
      const haystack = `${entityId} ${friendlyName}`;

      let score = 0;
      if (haystack.includes('instantaneous_demand') || haystack.includes('instantaneous demand')) {
        score += 100;
      }
      if (
        haystack.includes('home load') ||
        haystack.includes('home_load') ||
        haystack.includes('house power') ||
        haystack.includes('active power') ||
        haystack.includes('total power') ||
        haystack.includes('main power') ||
        haystack.includes('demand')
      ) {
        score += 30;
      }
      if (
        haystack.includes('solar') ||
        haystack.includes('battery') ||
        haystack.includes('grid import') ||
        haystack.includes('grid export') ||
        haystack.includes('grid_') ||
        haystack.includes('pv') ||
        haystack.includes('charger')
      ) {
        score -= 40;
      }

      return {
        entityId,
        score,
        watts: parseW(entity.state),
      };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  return {
    entityId: candidates[0]?.entityId,
    watts: candidates[0]?.watts ?? 0,
  };
}

function inferredHomeLoadCandidateEqual(
  a: InferredHomeLoadCandidate,
  b: InferredHomeLoadCandidate
): boolean {
  return a.entityId === b.entityId && a.watts === b.watts;
}

export function useEnergyEntityOptions(): EnergyEntityOptionsSnapshot {
  return useHomeAssistant(
    (state: HomeAssistantStore) => ({
      powerOptions: buildEnergyEntityOptions(state.entities ?? null, 'power'),
      energyStatOptions: buildEnergyEntityOptions(state.entities ?? null, 'energy-stat'),
      batteryOptions: buildEnergyEntityOptions(state.entities ?? null, 'battery-soc'),
    }),
    energyEntityOptionsSnapshotEqual
  );
}

export function useEnergyUsageSensorOptions(): EnergyUsageSensorOption[] {
  return useHomeAssistant(
    (state: HomeAssistantStore) => buildEnergyUsageSensorOptions(state.entities ?? null),
    energyUsageSensorOptionsEqual
  );
}

export function useInferredHomeLoadSensor(): InferredHomeLoadCandidate {
  return useHomeAssistant(
    (state: HomeAssistantStore) => inferHomeLoadPowerSensor(state.entities ?? null),
    inferredHomeLoadCandidateEqual
  );
}
