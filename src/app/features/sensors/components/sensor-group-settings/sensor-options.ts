import type { HassEntities, HassEntity } from 'home-assistant-js-websocket';
import {
  formatBinarySensorState,
  getSensorDeviceClass,
  inferSensorDisplayIcon,
} from '@/app/hooks/device-mappers';
import { formatSensorValue, getName, resolveEntityRoom } from '@/app/hooks/ha-entity-utils';
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
  formatOptions?: Parameters<typeof formatSensorValue>[1];
  includeBinarySensors?: boolean;
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
  formatOptions?: Parameters<typeof formatSensorValue>[1];
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

function getSensorDisplayValue(
  entityId: string,
  entity: HassEntity,
  formatOptions?: Parameters<typeof formatSensorValue>[1]
): { value: string; unit: string } {
  const deviceClass = getSensorDeviceClass(entity);
  if (entityId.startsWith('binary_sensor.')) {
    const status = formatBinarySensorState(entity.state, deviceClass);
    return { value: status.value, unit: '' };
  }

  if (SENSOR_UNAVAILABLE_STATES.has(entity.state)) {
    const formatted = formatSensorValue(entity, formatOptions);
    return { value: entity.state, unit: formatted?.unit ?? '' };
  }

  return formatSensorValue(entity, formatOptions) ?? { value: entity.state, unit: '' };
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
  return inferSensorDisplayIcon(entityId, deviceClass, unit);
}

function mapSensorOption(
  entityId: string,
  entity: HassEntity,
  context: SensorOptionContext,
  formatOptions?: Parameters<typeof formatSensorValue>[1]
): AvailableSensor {
  const entityEntry = context.entityRegistryMap.get(entityId);
  const deviceClass = getSensorDeviceClass(entity);
  const formatted = getSensorDisplayValue(entityId, entity, formatOptions);

  return {
    id: entityId,
    label: getName(entity, entityEntry),
    value: formatted.value,
    unit: formatted.unit,
    icon: inferSensorIcon(deviceClass, formatted.unit, entityId),
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
  formatOptions,
  includeBinarySensors = false,
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
    .filter(
      ([entityId]) =>
        entityId.startsWith('sensor.') ||
        (includeBinarySensors && entityId.startsWith('binary_sensor.'))
    )
    .map(([entityId, entity]) => mapSensorOption(entityId, entity, context, formatOptions))
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
  formatOptions,
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

    const deviceClass = getSensorDeviceClass(entity);
    const formatted = getSensorDisplayValue(entityId, entity, formatOptions);

    return {
      id: entityId,
      label:
        typeof entity.attributes?.friendly_name === 'string'
          ? entity.attributes.friendly_name
          : entityId,
      value: formatted.value,
      unit: formatted.unit,
      icon: inferSensorIcon(deviceClass, formatted.unit, entityId),
    };
  });
}
