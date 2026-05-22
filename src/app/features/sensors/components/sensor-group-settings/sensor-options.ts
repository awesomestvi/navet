import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import { getName, resolveEntityRoom } from '@/app/hooks/ha-entity-utils';
import type {
  HomeAssistantAreaRegistryEntry,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from '@/app/services/home-assistant.service';
import type { SensorIconType, SensorReading } from '../sensors';
import type { AvailableSensor } from './types';

interface SensorRegistryContext {
  areas?: HomeAssistantAreaRegistryEntry[];
  deviceRegistry?: HomeAssistantDeviceRegistryEntry[];
  entityRegistry?: HomeAssistantEntityRegistryEntry[];
}

interface SensorOptionBuildParams extends SensorRegistryContext {
  entities: HassEntities | null | undefined;
}

interface SensorOptionContext {
  areaMap: Map<string, string>;
  deviceRegistryMap: Map<string, HomeAssistantDeviceRegistryEntry>;
  entityRegistryMap: Map<string, HomeAssistantEntityRegistryEntry>;
}

interface ResolveSensorReadingsParams {
  entities: HassEntities | null | undefined;
  sensorEntityIds: string[];
  fallbackSensors?: SensorReading[];
}

const SENSOR_UNAVAILABLE_STATES = new Set(['unknown', 'unavailable']);

function getEntityRegistryMap(entityRegistry: HomeAssistantEntityRegistryEntry[] | undefined) {
  return new Map((entityRegistry ?? []).map((entry) => [entry.entity_id, entry]));
}

function getAreaMap(areas: HomeAssistantAreaRegistryEntry[] | undefined) {
  return new Map((areas ?? []).map((area) => [area.area_id, area.name]));
}

function getDeviceRegistryMap(deviceRegistry: HomeAssistantDeviceRegistryEntry[] | undefined) {
  return new Map((deviceRegistry ?? []).map((device) => [device.id, device]));
}

function getSensorUnit(entity: HassEntity): string {
  const unit =
    entity.attributes?.unit_of_measurement ?? entity.attributes?.native_unit_of_measurement;
  return typeof unit === 'string' ? unit : '';
}

function getSensorValue(entity: HassEntity): string {
  if (SENSOR_UNAVAILABLE_STATES.has(entity.state)) {
    return entity.state;
  }

  return entity.state;
}

function getSensorCategory(deviceClass: string | undefined): AvailableSensor['category'] {
  switch (deviceClass) {
    case 'energy':
    case 'power':
      return 'energy';
    case 'temperature':
    case 'humidity':
      return 'climate';
    case 'carbon_dioxide':
    case 'illuminance':
    case 'pressure':
    case 'pm1':
    case 'pm10':
    case 'pm25':
    case 'volatile_organic_compounds':
    case 'wind_speed':
      return 'environmental';
    default:
      return 'other';
  }
}

export function inferSensorIcon(
  deviceClass: string | undefined,
  unit: string,
  entityId: string
): SensorIconType {
  switch (deviceClass) {
    case 'energy':
    case 'power':
      return 'zap';
    case 'temperature':
      return 'thermometer';
    case 'humidity':
      return 'droplets';
    case 'carbon_dioxide':
    case 'pm1':
    case 'pm10':
    case 'pm25':
    case 'volatile_organic_compounds':
    case 'wind_speed':
      return 'wind';
    case 'illuminance':
      return 'sun';
    case 'battery':
      return 'activity';
    default:
      break;
  }

  const normalizedUnit = unit.toLowerCase();
  const searchText = entityId.toLowerCase();
  if (normalizedUnit.includes('w') || normalizedUnit.includes('kwh')) {
    return 'zap';
  }
  if (normalizedUnit.includes('c') || searchText.includes('temperature')) {
    return 'thermometer';
  }
  if (normalizedUnit === '%' || searchText.includes('humidity')) {
    return 'droplets';
  }

  return 'gauge';
}

function mapSensorOption(
  entityId: string,
  entity: HassEntity,
  context: SensorOptionContext
): AvailableSensor {
  const entityEntry = context.entityRegistryMap.get(entityId);
  const deviceClass =
    typeof entity.attributes?.device_class === 'string'
      ? entity.attributes.device_class.toLowerCase()
      : undefined;
  const unit = getSensorUnit(entity);

  return {
    id: entityId,
    label: getName(entity, entityEntry),
    value: getSensorValue(entity),
    unit,
    icon: inferSensorIcon(deviceClass, unit, entityId),
    category: getSensorCategory(deviceClass),
    room: resolveEntityRoom(
      entityId,
      entity,
      context.areaMap,
      context.entityRegistryMap,
      context.deviceRegistryMap
    ),
  };
}

export function buildAvailableSensorOptions({
  entities,
  areas = [],
  deviceRegistry = [],
  entityRegistry = [],
}: SensorOptionBuildParams): AvailableSensor[] {
  if (!entities) {
    return [];
  }

  const context = {
    areaMap: getAreaMap(areas),
    deviceRegistryMap: getDeviceRegistryMap(deviceRegistry),
    entityRegistryMap: getEntityRegistryMap(entityRegistry),
  };

  return Object.entries(entities)
    .filter(([entityId]) => entityId.startsWith('sensor.'))
    .map(([entityId, entity]) => mapSensorOption(entityId, entity, context))
    .sort(
      (left, right) =>
        (left.room ?? '').localeCompare(right.room ?? '') ||
        left.label.localeCompare(right.label) ||
        left.id.localeCompare(right.id)
    );
}

export function resolveSensorReadings({
  entities,
  sensorEntityIds,
  fallbackSensors = [],
}: ResolveSensorReadingsParams): SensorReading[] {
  return sensorEntityIds.map((entityId) => {
    const entity = entities?.[entityId];
    const fallback = fallbackSensors.find((sensor) => sensor.id === entityId);

    if (!entity) {
      return {
        id: entityId,
        label: fallback?.label ?? entityId,
        value: fallback?.value ?? 'unavailable',
        unit: fallback?.unit ?? '',
        icon: fallback?.icon ?? 'gauge',
      };
    }

    const unit = getSensorUnit(entity);
    const deviceClass =
      typeof entity.attributes?.device_class === 'string'
        ? entity.attributes.device_class.toLowerCase()
        : undefined;

    return {
      id: entityId,
      label:
        typeof entity.attributes?.friendly_name === 'string'
          ? entity.attributes.friendly_name
          : entityId,
      value: getSensorValue(entity),
      unit,
      icon: inferSensorIcon(deviceClass, unit, entityId),
    };
  });
}
