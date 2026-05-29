import type { PlatformMessageClient } from '@/app/platform/provider-feature-models';
import type {
  EnergyConsumerCategory,
  EnergyDeviceSource,
  EnergySourceConfig,
} from '../types/energy.types';

// ─── HA WebSocket API shapes ────────────────────────────────────────────────

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
  stat_energy_from: string; // discharge
  stat_energy_to: string; // charge
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

export type HaEnergyEntityLike = {
  state: string;
  attributes?: Record<string, unknown>;
};

export type HaEnergyEntityMap = Record<string, HaEnergyEntityLike>;

export interface HaEnergyEntityRegistryEntry {
  entity_id: string;
  device_id?: string | null;
}

// ─── API call ────────────────────────────────────────────────────────────────

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
  return DEVICE_CATEGORY_HINTS.find(([k]) => lc.includes(k))?.[1] ?? 'other';
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
    (entry) => entry.entity_id === energyEntityId
  )?.device_id;
  if (energyDeviceId) {
    const siblingPowerEntry = entityRegistry.find(
      (entry) =>
        entry.entity_id !== energyEntityId &&
        entry.device_id === energyDeviceId &&
        entry.entity_id.startsWith('sensor.') &&
        isLikelyPowerSensor(entry.entity_id, entities[entry.entity_id])
    );

    if (siblingPowerEntry) {
      return siblingPowerEntry.entity_id;
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

// ─── Prefs → config mapping ──────────────────────────────────────────────────

/**
 * Convert HA energy preferences into an EnergySourceConfig.
 * This intentionally maps only IDs exposed by Home Assistant Energy prefs.
 * Navet does not infer or persist extra local energy entity configuration.
 */
export function mapPrefsToConfig(prefs: HaEnergyPrefs): EnergySourceConfig {
  const config: EnergySourceConfig = { devices: [] };

  for (const source of prefs.energy_sources) {
    switch (source.type) {
      case 'solar':
        config.solarEnergyEntityId = source.stat_energy_from;
        break;

      case 'grid': {
        const gridSource = source as HaEnergyGridSource;
        const importId = gridSource.stat_energy_from ?? gridSource.flow_from?.[0]?.stat_energy_from;
        const exportId = gridSource.stat_energy_to ?? gridSource.flow_to?.[0]?.stat_energy_to;
        if (importId) {
          config.gridImportEnergyEntityId = importId;
        }
        if (exportId) {
          config.gridExportEnergyEntityId = exportId;
        }
        break;
      }

      case 'battery':
        // HA Energy prefs expose battery energy statistics, but not live SOC or
        // power sensors. Keep battery live state unavailable rather than
        // guessing local entities.
        break;

      case 'gas':
        config.gasEnergyEntityId = source.stat_energy_from;
        break;

      case 'water':
        config.hotWaterEnergyEntityId = source.stat_energy_from;
        break;
    }
  }

  const devices: EnergyDeviceSource[] = prefs.device_consumption.map((device) => {
    const name = device.name ?? device.stat_consumption;
    return {
      entityId: device.stat_consumption,
      name,
      category: guessDeviceCategory(name),
    };
  });
  const waterDevices: EnergyDeviceSource[] =
    prefs.device_consumption_water?.map((device) => {
      const name = device.name ?? device.stat_consumption;
      return {
        entityId: device.stat_consumption,
        name,
        category: 'water_heater',
      };
    }) ?? [];
  config.devices = [...devices, ...waterDevices];

  return config;
}

export function augmentConfigWithLivePowerEntities(
  config: EnergySourceConfig,
  entities: HaEnergyEntityMap,
  entityRegistry: HaEnergyEntityRegistryEntry[] = []
): EnergySourceConfig {
  const gridImportPowerEntityId =
    config.gridImportPowerEntityId ??
    inferRelatedPowerEntityId(config.gridImportEnergyEntityId, entities, entityRegistry);
  const gridExportPowerEntityId =
    config.gridExportPowerEntityId ??
    inferRelatedPowerEntityId(config.gridExportEnergyEntityId, entities, entityRegistry);
  const solarPowerEntityId =
    config.solarPowerEntityId ??
    inferRelatedPowerEntityId(config.solarEnergyEntityId, entities, entityRegistry);
  const homeLoadPowerEntityId =
    config.homeLoadPowerEntityId ?? inferHomeLoadPowerEntityId(config, entities, entityRegistry);

  return {
    ...config,
    gridImportPowerEntityId,
    gridExportPowerEntityId,
    solarPowerEntityId,
    homeLoadPowerEntityId,
    devices: config.devices.map((device) => ({
      ...device,
      powerEntityId:
        device.powerEntityId ??
        inferRelatedPowerEntityId(device.entityId, entities, entityRegistry),
    })),
  };
}
