import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import type { TranslateFn } from '../i18n';
import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from '../services/home-assistant.service';
import type { DeviceCollection, DeviceMetric, HelperDevice } from '../types/device.types';
import {
  getMetricLabel,
  helperLabelForDomain,
  inferMetricIcon,
  normalizeMetric,
  parseNumberish,
} from './ha-entity-utils';

export interface HADeviceRegistryMaps {
  areaMap: Map<string, string>;
  deviceRegistryMap: Map<string, HomeAssistantDeviceRegistryEntry>;
  entityRegistryMap: Map<string, HomeAssistantEntityRegistryEntry>;
}

export interface HADeviceIndexes {
  switchMetricsByDeviceId: Map<string, DeviceMetric[]>;
  primarySwitchEntityIdByDeviceId: Map<string, string>;
  deviceIdsWithVacuumEntity: Set<string>;
  deviceIdsWithClimateEntity: Set<string>;
  deviceIdsWithPrimaryCards: Set<string>;
}

const PRIMARY_CARD_DOMAINS = new Set([
  'light',
  'switch',
  'fan',
  'climate',
  'water_heater',
  'cover',
  'lock',
  'media_player',
  'vacuum',
  'camera',
]);

export function getEntityObjectId(entityId: string): string {
  const separatorIndex = entityId.indexOf('.');
  return separatorIndex === -1 ? entityId : entityId.slice(separatorIndex + 1);
}

export function getDomain(entityId: string): string {
  const separatorIndex = entityId.indexOf('.');
  return separatorIndex === -1 ? entityId : entityId.slice(0, separatorIndex);
}

export function getEntityCategory(
  entityEntry: { entity_category?: unknown } | undefined
): 'config' | 'diagnostic' | null {
  const raw = entityEntry?.entity_category;
  return raw === 'config' || raw === 'diagnostic' ? raw : null;
}

export function getSwitchPrimarySortKey(
  entityId: string,
  entity: HassEntity,
  entityEntry?: { entity_category?: unknown }
): [number, number, string] {
  const entityCategory = getEntityCategory(entityEntry);
  const categoryPenalty =
    entityCategory === 'config' ? 100 : entityCategory === 'diagnostic' ? 200 : 0;
  const objectId = getEntityObjectId(entityId).toLowerCase();
  const friendlyName =
    typeof entity.attributes?.friendly_name === 'string'
      ? entity.attributes.friendly_name.toLowerCase()
      : '';
  const helperKeywordPenalty =
    /(boost|timer|speed|mode|humidity|light|delay|interval|preset|continuous|trickle|gateway|restart|reboot|update)/.test(
      `${objectId} ${friendlyName}`
    )
      ? 20
      : 0;

  return [categoryPenalty + helperKeywordPenalty, objectId.length, objectId];
}

export function compareSortKeys(left: [number, number, string], right: [number, number, string]) {
  if (left[0] !== right[0]) {
    return left[0] - right[0];
  }

  if (left[1] !== right[1]) {
    return left[1] - right[1];
  }

  return left[2].localeCompare(right[2]);
}

export function createEmptyDeviceCollection(): DeviceCollection {
  return {
    lights: [],
    fans: [],
    hvac: [],
    climate: [],
    media: [],
    weather: [],
    switches: [],
    helpers: [],
    covers: [],
    locks: [],
    scenes: [],
    persons: [],
    sensors: [],
    vacuums: [],
    calendars: [],
    cameras: [],
    'grouped-sensors': [],
  };
}

export function createRegistryMaps(
  areas: HomeAssistantAreaRegistryEntry[],
  deviceRegistry: HomeAssistantDeviceRegistryEntry[],
  entityRegistry: HomeAssistantEntityRegistryEntry[]
): HADeviceRegistryMaps {
  return {
    areaMap: new Map(areas.map((area) => [area.area_id, area.name])),
    entityRegistryMap: new Map(
      entityRegistry.map((registryEntry) => [registryEntry.entity_id, registryEntry])
    ),
    deviceRegistryMap: new Map(deviceRegistry.map((device) => [device.id, device])),
  };
}

function upsertDeviceMetric(metricState: DeviceMetric[], nextMetric: DeviceMetric) {
  const existingIndex = metricState.findIndex((metric) => metric.label === nextMetric.label);
  if (existingIndex === -1) {
    metricState.push(nextMetric);
    return;
  }

  metricState[existingIndex] = nextMetric;
}

function addSensorMetric(
  indexes: HADeviceIndexes,
  entityId: string,
  entity: HassEntity,
  deviceId: string
) {
  const rawValue =
    parseNumberish(entity.state) ??
    parseNumberish(entity.attributes?.native_value) ??
    parseNumberish(entity.attributes?.value);
  if (rawValue === null) {
    return;
  }

  const metricState = indexes.switchMetricsByDeviceId.get(deviceId) ?? [];
  const deviceClass =
    typeof entity.attributes?.device_class === 'string'
      ? entity.attributes.device_class.toLowerCase()
      : null;
  const unit =
    entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement;
  const friendlyName =
    typeof entity.attributes?.friendly_name === 'string'
      ? entity.attributes.friendly_name.toLowerCase()
      : '';
  const normalizedMetric = normalizeMetric(deviceClass, friendlyName, rawValue, unit);
  if (!normalizedMetric) {
    return;
  }

  if (
    normalizedMetric.label === 'Energy' &&
    isNonDisplaySwitchEnergyMetric(entityId, entity, friendlyName)
  ) {
    return;
  }

  upsertDeviceMetric(metricState, {
    ...normalizedMetric,
    icon: inferMetricIcon(
      deviceClass,
      `${entityId} ${friendlyName} ${entity.attributes?.friendly_name ?? ''}`,
      unit
    ),
    category: 'measurement',
  });
  indexes.switchMetricsByDeviceId.set(deviceId, metricState);
}

function isNonDisplaySwitchEnergyMetric(
  entityId: string,
  entity: HassEntity,
  friendlyName: string
) {
  const stateClass =
    typeof entity.attributes?.state_class === 'string'
      ? entity.attributes.state_class.toLowerCase()
      : '';
  const searchText = `${entityId} ${friendlyName}`.toLowerCase();
  const isDailyEnergy = /\b(today|daily|day)\b/.test(searchText);

  return stateClass === 'total_increasing' && !isDailyEnergy;
}

function addConfigMetric(
  indexes: HADeviceIndexes,
  entityId: string,
  entity: HassEntity,
  deviceId: string,
  domain: string
) {
  const metricState = indexes.switchMetricsByDeviceId.get(deviceId) ?? [];
  const label = getMetricLabel(entityId, entity);
  const unit =
    typeof entity.attributes?.unit_of_measurement === 'string'
      ? entity.attributes.unit_of_measurement
      : typeof entity.attributes?.native_unit_of_measurement === 'string'
        ? entity.attributes.native_unit_of_measurement
        : '';
  const parsedValue =
    domain === 'select'
      ? entity.state
      : (parseNumberish(entity.state) ??
        parseNumberish(entity.attributes?.native_value) ??
        parseNumberish(entity.attributes?.value));
  if (parsedValue == null || parsedValue === '') {
    return;
  }

  if (isNonDisplayConfigMetricValue(parsedValue)) {
    return;
  }

  upsertDeviceMetric(metricState, {
    label,
    value: parsedValue,
    unit,
    icon: inferMetricIcon(null, `${entityId} ${label}`, unit),
    category: 'configuration',
  });
  indexes.switchMetricsByDeviceId.set(deviceId, metricState);
}

function isNonDisplayConfigMetricValue(value: string | number) {
  if (typeof value === 'number') {
    return false;
  }

  return ['none', 'previousvalue', 'unknown', 'unavailable'].includes(
    value
      .trim()
      .replace(/[\s_-]/g, '')
      .toLowerCase()
  );
}

function trackPrimarySwitch(
  indexes: HADeviceIndexes,
  entities: HassEntities,
  entityRegistryMap: Map<string, HomeAssistantEntityRegistryEntry>,
  entityId: string,
  entity: HassEntity,
  entityEntry: HomeAssistantEntityRegistryEntry | undefined,
  deviceId: string
) {
  const currentPrimaryEntityId = indexes.primarySwitchEntityIdByDeviceId.get(deviceId);
  if (!currentPrimaryEntityId) {
    indexes.primarySwitchEntityIdByDeviceId.set(deviceId, entityId);
    return;
  }

  const currentPrimaryEntity = entities[currentPrimaryEntityId];
  if (!currentPrimaryEntity) {
    indexes.primarySwitchEntityIdByDeviceId.set(deviceId, entityId);
    return;
  }

  const currentSortKey = getSwitchPrimarySortKey(
    currentPrimaryEntityId,
    currentPrimaryEntity,
    entityRegistryMap.get(currentPrimaryEntityId)
  );
  const candidateSortKey = getSwitchPrimarySortKey(entityId, entity, entityEntry);

  if (compareSortKeys(candidateSortKey, currentSortKey) < 0) {
    indexes.primarySwitchEntityIdByDeviceId.set(deviceId, entityId);
  }
}

export function buildDeviceIndexes(
  entities: HassEntities,
  entityRegistryMap: Map<string, HomeAssistantEntityRegistryEntry>
): HADeviceIndexes {
  const indexes: HADeviceIndexes = {
    switchMetricsByDeviceId: new Map<string, DeviceMetric[]>(),
    primarySwitchEntityIdByDeviceId: new Map<string, string>(),
    deviceIdsWithVacuumEntity: new Set<string>(),
    deviceIdsWithClimateEntity: new Set<string>(),
    deviceIdsWithPrimaryCards: new Set<string>(),
  };

  for (const [entityId, entity] of Object.entries(entities)) {
    const domain = getDomain(entityId);
    const entityEntry = entityRegistryMap.get(entityId);
    const deviceId = entityEntry?.device_id ?? undefined;

    if (deviceId && PRIMARY_CARD_DOMAINS.has(domain)) {
      indexes.deviceIdsWithPrimaryCards.add(deviceId);
    }

    if (domain === 'vacuum' && deviceId) {
      indexes.deviceIdsWithVacuumEntity.add(deviceId);
    }

    if ((domain === 'climate' || domain === 'water_heater') && deviceId) {
      indexes.deviceIdsWithClimateEntity.add(deviceId);
    }

    if (domain === 'sensor' && deviceId) {
      addSensorMetric(indexes, entityId, entity, deviceId);
      continue;
    }

    if (
      (domain === 'number' || domain === 'input_number' || domain === 'select') &&
      deviceId &&
      getEntityCategory(entityEntry) === 'config'
    ) {
      addConfigMetric(indexes, entityId, entity, deviceId, domain);
      continue;
    }

    if (domain === 'switch' && deviceId) {
      trackPrimarySwitch(
        indexes,
        entities,
        entityRegistryMap,
        entityId,
        entity,
        entityEntry,
        deviceId
      );
    }
  }

  return indexes;
}

export function shouldSuppressForVacuumDevice(
  entityId: string,
  entityRegistryMap: Map<string, HomeAssistantEntityRegistryEntry>,
  indexes: HADeviceIndexes
) {
  const deviceId = entityRegistryMap.get(entityId)?.device_id;
  return deviceId ? indexes.deviceIdsWithVacuumEntity.has(deviceId) : false;
}

export function shouldSuppressHelperCard(
  entityId: string,
  entityRegistryMap: Map<string, HomeAssistantEntityRegistryEntry>,
  indexes: HADeviceIndexes
) {
  if (shouldSuppressForVacuumDevice(entityId, entityRegistryMap, indexes)) {
    return true;
  }

  const deviceId = entityRegistryMap.get(entityId)?.device_id;
  return deviceId ? indexes.deviceIdsWithPrimaryCards.has(deviceId) : false;
}

export function shouldSkipSwitchDevice(
  entityId: string,
  entityEntry: HomeAssistantEntityRegistryEntry | undefined,
  indexes: HADeviceIndexes
) {
  const deviceId = entityEntry?.device_id;
  const entityCategory = getEntityCategory(entityEntry);

  if (entityCategory === 'config' || entityCategory === 'diagnostic') {
    return true;
  }

  if (deviceId && indexes.deviceIdsWithVacuumEntity.has(deviceId)) {
    return true;
  }

  if (deviceId && indexes.deviceIdsWithClimateEntity.has(deviceId)) {
    return true;
  }

  if (deviceId && indexes.primarySwitchEntityIdByDeviceId.get(deviceId) !== entityId) {
    return true;
  }

  return false;
}

export function mapHelperDevice(
  domain: string,
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  t: TranslateFn
): HelperDevice | null {
  if (domain === 'input_boolean') {
    return {
      id: entityId,
      name,
      room,
      size: 'small',
      state: entity.state === 'on',
      entityType: helperLabelForDomain(domain, t),
      serviceDomain: 'input_boolean',
    };
  }

  if (domain === 'script') {
    return {
      id: entityId,
      name,
      room,
      size: 'small',
      state: entity.state === 'on',
      entityType: helperLabelForDomain(domain, t),
      serviceDomain: 'script',
      serviceAction: 'turn_on',
    };
  }

  if (domain === 'button' || domain === 'input_button') {
    return {
      id: entityId,
      name,
      room,
      size: 'small',
      state: false,
      entityType: helperLabelForDomain(domain, t),
      serviceDomain: domain,
      serviceAction: 'press',
    };
  }

  return null;
}
