import type { SensorIconType } from '@navet/app/features/sensors/components/sensors';
import type { SensorDevice } from '@navet/app/types/device.types';
import type { HassEntity } from 'home-assistant-js-websocket';
import { formatSensorValue } from '../entity-utils';

const SENSOR_UNAVAILABLE_STATES = new Set(['unknown', 'unavailable']);
const SENSOR_STATUS_ON_STATES = new Set(['on', 'detected', 'open', 'wet', 'problem', 'unsafe']);

export function getSensorDeviceClass(entity: {
  attributes?: Record<string, unknown>;
}): string | undefined {
  return typeof entity.attributes?.device_class === 'string'
    ? entity.attributes.device_class.toLowerCase()
    : undefined;
}

export function inferSensorDisplayIcon(
  entityId: string,
  deviceClass: string | undefined,
  unit: string
): SensorIconType {
  const searchText = entityId.toLowerCase();
  const normalizedUnit = unit.toLowerCase();

  switch (deviceClass) {
    case 'battery':
      return 'activity';
    case 'carbon_dioxide':
    case 'carbon_monoxide':
    case 'pm1':
    case 'pm10':
    case 'pm25':
    case 'volatile_organic_compounds':
    case 'wind_speed':
      return 'wind';
    case 'door':
    case 'garage_door':
    case 'opening':
      return 'door';
    case 'energy':
    case 'power':
      return 'zap';
    case 'humidity':
    case 'moisture':
      return 'droplets';
    case 'gas':
    case 'problem':
    case 'safety':
    case 'tamper':
      return 'alert';
    case 'illuminance':
      return 'sun';
    case 'motion':
    case 'occupancy':
    case 'presence':
      return 'motion';
    case 'smoke':
      return 'smoke';
    case 'temperature':
      return 'thermometer';
    case 'window':
      return 'window';
    default:
      break;
  }

  if (normalizedUnit === '%' || searchText.includes('humidity')) {
    return 'droplets';
  }
  if (normalizedUnit.includes('w') || normalizedUnit.includes('kwh')) {
    return 'zap';
  }
  if (normalizedUnit.includes('c') || normalizedUnit.includes('f') || searchText.includes('temp')) {
    return 'thermometer';
  }
  if (searchText.includes('motion') || searchText.includes('occupancy')) {
    return 'motion';
  }
  if (searchText.includes('door')) {
    return 'door';
  }
  if (searchText.includes('window')) {
    return 'window';
  }

  return 'gauge';
}

export function formatBinarySensorState(
  state: string,
  deviceClass: string | undefined
): { value: string; isActive: boolean } {
  const normalizedState = state.toLowerCase();
  const isActive = SENSOR_STATUS_ON_STATES.has(normalizedState);

  if (SENSOR_UNAVAILABLE_STATES.has(normalizedState)) {
    return { value: state, isActive: false };
  }

  switch (deviceClass) {
    case 'door':
    case 'garage_door':
    case 'opening':
    case 'window':
      return { value: isActive ? 'Open' : 'Closed', isActive };
    case 'gas':
    case 'moisture':
    case 'smoke':
      return { value: isActive ? 'Detected' : 'Clear', isActive };
    case 'motion':
    case 'occupancy':
    case 'presence':
      return { value: isActive ? 'Detected' : 'Clear', isActive };
    case 'problem':
    case 'safety':
    case 'tamper':
      return { value: isActive ? 'Problem' : 'OK', isActive };
    default:
      if (normalizedState === 'on') {
        return { value: 'On', isActive };
      }
      if (normalizedState === 'off') {
        return { value: 'Off', isActive };
      }
      return { value: state, isActive };
  }
}

export function mapSensorDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  formatOptions?: Parameters<typeof formatSensorValue>[1]
): SensorDevice | null {
  const domain = entityId.slice(0, entityId.indexOf('.'));
  const deviceClass = getSensorDeviceClass(entity);
  const formatted = formatSensorValue(entity, formatOptions);
  const unit = formatted?.unit ?? '';

  if (domain === 'binary_sensor') {
    const status = formatBinarySensorState(entity.state, deviceClass);
    const isUnavailable = SENSOR_UNAVAILABLE_STATES.has(entity.state);
    return {
      id: entityId,
      name,
      room,
      value: status.value,
      unit: '',
      icon: inferSensorDisplayIcon(entityId, deviceClass, ''),
      entityType: deviceClass ? deviceClass.replace(/_/g, ' ') : 'Binary sensor',
      deviceClass,
      status: isUnavailable ? 'unavailable' : status.isActive ? 'active' : 'clear',
      lastUpdated: entity.last_updated,
      size: 'small',
    };
  }

  if (domain !== 'sensor' || !formatted) {
    return null;
  }

  return {
    id: entityId,
    name,
    room,
    value: formatted.value,
    unit,
    icon: inferSensorDisplayIcon(entityId, deviceClass, unit),
    entityType: deviceClass ? deviceClass.replace(/_/g, ' ') : 'Sensor',
    deviceClass,
    status: SENSOR_UNAVAILABLE_STATES.has(entity.state) ? 'unavailable' : 'measurement',
    lastUpdated: entity.last_updated,
    size: 'small',
  };
}
