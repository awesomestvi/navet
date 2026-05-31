import type { EnergyConsumerCategory, EnergySourceConfig } from '@navet/core/energy-types';
import type {
  PlatformEnergyEntityLike,
  PlatformEnergyEntityMap,
  PlatformEnergyEntityRegistryEntry,
  PlatformMessageClient,
} from '@navet/core/provider-feature-models';

export interface HaEnergySolarSource {
  type: 'solar';
  stat_energy_from: string;
}

export interface HaEnergyGridSource {
  type: 'grid';
  stat_energy_from?: string;
  stat_energy_to?: string | null;
  flow_from?: { stat_energy_from: string }[];
  flow_to?: { stat_energy_to: string }[];
}

export interface HaEnergyBatterySource {
  type: 'battery';
  stat_energy_from: string;
  stat_energy_to: string;
}

export interface HaEnergyGasOrWaterSource {
  type: 'gas' | 'water';
  stat_energy_from: string;
}

export type HaEnergySource =
  | HaEnergySolarSource
  | HaEnergyGridSource
  | HaEnergyBatterySource
  | HaEnergyGasOrWaterSource;

export interface HaDeviceConsumption {
  stat_consumption: string;
  name?: string;
}

export interface HaEnergyPrefs {
  energy_sources: HaEnergySource[];
  device_consumption: HaDeviceConsumption[];
  device_consumption_water?: HaDeviceConsumption[];
}

export type HaEnergyEntityMap = PlatformEnergyEntityMap;
export type HaEnergyEntityLike = PlatformEnergyEntityLike;
export type HaEnergyEntityRegistryEntry = PlatformEnergyEntityRegistryEntry & {
  entity_id?: string;
  device_id?: string | null;
};

function getRegistryEntityId(entry: HaEnergyEntityRegistryEntry): string {
  return entry.entityId ?? entry.entity_id ?? '';
}

function getRegistryDeviceId(entry: HaEnergyEntityRegistryEntry): string | null | undefined {
  return entry.deviceId ?? entry.device_id;
}

export async function getEnergyPrefs(messageClient: PlatformMessageClient): Promise<HaEnergyPrefs> {
  return messageClient.sendMessagePromise({ type: 'energy/get_prefs' }) as Promise<HaEnergyPrefs>;
}

const DEVICE_CATEGORY_HINTS: [string, EnergyConsumerCategory][] = [
  ['ev_charger', 'ev_charger'],
  ['ev', 'ev_charger'],
  ['charger', 'ev_charger'],
  ['hvac', 'hvac'],
  ['heat_pump', 'hvac'],
  ['heat pump', 'hvac'],
  ['aircon', 'hvac'],
  ['water_heater', 'water_heater'],
  ['boiler', 'water_heater'],
  ['floor_heating', 'floor_heating'],
  ['underfloor', 'floor_heating'],
  ['dishwasher', 'dishwasher'],
  ['washer', 'washer'],
  ['washing_machine', 'washer'],
  ['dryer', 'dryer'],
  ['toilet_heater', 'toilet_heater'],
  ['bathroom_heater', 'bathroom_heater'],
];

function guessDeviceCategory(name: string): EnergyConsumerCategory {
  const lc = name.toLowerCase();
  return DEVICE_CATEGORY_HINTS.find(([key]) => lc.includes(key))?.[1] ?? 'other';
}

function getEntityDeviceClass(entity: HaEnergyEntityLike | undefined): string {
  return String(entity?.attributes?.device_class ?? '').toLowerCase();
}

function getEntityUnit(entity: HaEnergyEntityLike | undefined): string {
  return String(
    entity?.attributes?.unit_of_measurement ?? entity?.attributes?.native_unit_of_measurement ?? ''
  ).toUpperCase();
}

function parsePowerEntityWatts(entity: HaEnergyEntityLike | undefined): number | null {
  if (!entity) {
    return null;
  }

  const raw = Number.parseFloat(String(entity.state));
  if (!Number.isFinite(raw)) {
    return null;
  }

  const unit = getEntityUnit(entity);
  if (unit === 'W') {
    return raw;
  }
  if (unit === 'KW') {
    return raw * 1000;
  }

  return getEntityDeviceClass(entity) === 'power' ? raw : null;
}

function isLikelyPowerSensor(entityId: string, entity: HaEnergyEntityLike | undefined): boolean {
  if (parsePowerEntityWatts(entity) === null) {
    return false;
  }

  const friendlyName = String(entity?.attributes?.friendly_name ?? '').toLowerCase();
  const haystack = `${entityId} ${friendlyName}`;

  return (
    getEntityDeviceClass(entity) === 'power' ||
    getEntityUnit(entity) === 'W' ||
    getEntityUnit(entity) === 'KW' ||
    haystack.includes('power') ||
    haystack.includes('demand') ||
    haystack.includes('electrical_measurement')
  );
}

function getPowerCandidateIds(energyEntityId: string): string[] {
  return [
    energyEntityId.replace('_summation_delivered', '_instantaneous_demand'),
    energyEntityId.replace('_summation_received', '_instantaneous_demand'),
    energyEntityId.replace('_summation_delivered', '_power'),
    energyEntityId.replace('_summation_received', '_power'),
    energyEntityId.replace('_energy_usage', '_power'),
    energyEntityId.replace('_energy_usage', '_power_usage'),
    energyEntityId.replace('_energy_usage', '_power_consumed'),
    energyEntityId.replace('_energy_usage', '_power_now'),
    energyEntityId.replace('_energy_usage', '_current_power'),
    energyEntityId.replace('_energy', '_power'),
    energyEntityId.replace('_kwh', '_power'),
    energyEntityId.replace('_total_energy', '_power'),
    energyEntityId.replace('_summation_delivered', '_electrical_measurement'),
  ].filter(
    (candidate, index, candidates) =>
      candidate !== energyEntityId && candidates.indexOf(candidate) === index
  );
}

function inferRelatedPowerEntityId(
  energyEntityId: string | undefined,
  entities: HaEnergyEntityMap,
  entityRegistry: HaEnergyEntityRegistryEntry[] = []
): string | undefined {
  if (!energyEntityId) {
    return undefined;
  }

  const energyDeviceId = entityRegistry.find(
    (entry) => getRegistryEntityId(entry) === energyEntityId
  );
  const energyDeviceRef = energyDeviceId ? getRegistryDeviceId(energyDeviceId) : null;
  if (energyDeviceRef) {
    const siblingPowerEntry = entityRegistry.find(
      (entry) =>
        getRegistryEntityId(entry) !== energyEntityId &&
        getRegistryDeviceId(entry) === energyDeviceRef &&
        getRegistryEntityId(entry).startsWith('sensor.') &&
        isLikelyPowerSensor(getRegistryEntityId(entry), entities[getRegistryEntityId(entry)])
    );

    if (siblingPowerEntry) {
      return getRegistryEntityId(siblingPowerEntry);
    }
  }

  for (const candidate of getPowerCandidateIds(energyEntityId)) {
    if (parsePowerEntityWatts(entities[candidate]) !== null) {
      return candidate;
    }
  }

  return parsePowerEntityWatts(entities[energyEntityId]) !== null ? energyEntityId : undefined;
}

function inferHomeLoadPowerEntityId(
  config: EnergySourceConfig,
  entities: HaEnergyEntityMap,
  entityRegistry: HaEnergyEntityRegistryEntry[] = []
): string | undefined {
  const relatedGridPowerEntityId = inferRelatedPowerEntityId(
    config.gridImportEnergyEntityId,
    entities,
    entityRegistry
  );
  if (relatedGridPowerEntityId) {
    return relatedGridPowerEntityId;
  }

  const candidates = Object.entries(entities)
    .filter(
      ([entityId, entity]) =>
        entityId.startsWith('sensor.') && parsePowerEntityWatts(entity) !== null
    )
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
        haystack.includes('grid export') ||
        haystack.includes('pv') ||
        haystack.includes('charger')
      ) {
        score -= 40;
      }

      return { entityId, score };
    })
    .filter((candidate) => candidate.score > 0)
    .sort((left, right) => right.score - left.score);

  return candidates[0]?.entityId;
}

export function mapPrefsToConfig(prefs: HaEnergyPrefs): EnergySourceConfig {
  const config: EnergySourceConfig = {
    devices: [],
  };

  for (const source of prefs.energy_sources) {
    switch (source.type) {
      case 'solar':
        config.solarEnergyEntityId = source.stat_energy_from;
        break;
      case 'grid':
        config.gridImportEnergyEntityId = source.stat_energy_from;
        config.gridExportEnergyEntityId = source.stat_energy_to ?? undefined;
        break;
      case 'battery':
        break;
      case 'gas':
        config.gasEnergyEntityId = source.stat_energy_from;
        break;
      case 'water':
        config.hotWaterEnergyEntityId = source.stat_energy_from;
        break;
    }
  }

  config.devices = prefs.device_consumption.map((device) => ({
    entityId: device.stat_consumption,
    name: device.name ?? device.stat_consumption,
    category: guessDeviceCategory(device.name ?? device.stat_consumption),
  }));

  return config;
}

export function augmentConfigWithLivePowerEntities(
  config: EnergySourceConfig,
  entities: HaEnergyEntityMap,
  entityRegistry: HaEnergyEntityRegistryEntry[] = []
): EnergySourceConfig {
  return {
    ...config,
    homeLoadPowerEntityId:
      config.homeLoadPowerEntityId ?? inferHomeLoadPowerEntityId(config, entities, entityRegistry),
    gridImportPowerEntityId:
      config.gridImportPowerEntityId ??
      inferRelatedPowerEntityId(config.gridImportEnergyEntityId, entities, entityRegistry),
    gridExportPowerEntityId:
      config.gridExportPowerEntityId ??
      inferRelatedPowerEntityId(config.gridExportEnergyEntityId, entities, entityRegistry),
    solarPowerEntityId:
      config.solarPowerEntityId ??
      inferRelatedPowerEntityId(config.solarEnergyEntityId, entities, entityRegistry),
    batteryPowerEntityId:
      config.batteryPowerEntityId ??
      inferRelatedPowerEntityId(config.batterySocEntityId, entities, entityRegistry),
    devices: config.devices.map((device) => ({
      ...device,
      powerEntityId:
        device.powerEntityId ??
        inferRelatedPowerEntityId(device.entityId, entities, entityRegistry),
    })),
  };
}
