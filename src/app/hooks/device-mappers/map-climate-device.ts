import type { HassEntity } from 'home-assistant-js-websocket';
import type { ClimateDevice } from '../../types/device.types';
import { normalizeTemperatureUnit } from '../../utils/temperature';
import { parseNumberish } from '../ha-entity-utils';

function parseSupportedHvacModes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((mode): mode is string => typeof mode === 'string');
}

function resolveClimateSupportedModes(entityId: string, entity: HassEntity): string[] | undefined {
  const supportedModes = parseSupportedHvacModes(
    entity.attributes?.hvac_modes ?? entity.attributes?.operation_list
  );

  return entityId.startsWith('water_heater.') ? (supportedModes ?? []) : supportedModes;
}

function resolveClimateMode(entity: HassEntity): string {
  return (
    (typeof entity.state === 'string' && entity.state) ||
    (typeof entity.attributes?.hvac_mode === 'string' && entity.attributes.hvac_mode) ||
    (typeof entity.attributes?.operation_mode === 'string' && entity.attributes.operation_mode) ||
    'off'
  );
}

function resolveClimateTemperatureUnit(entity: HassEntity) {
  return (
    normalizeTemperatureUnit(entity.attributes?.unit_of_measurement) ??
    normalizeTemperatureUnit(entity.attributes?.temperature_unit) ??
    normalizeTemperatureUnit(entity.attributes?.native_unit_of_measurement)
  );
}

export function mapClimateDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): ClimateDevice {
  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    temperature: parseFloat(entity.attributes?.temperature) || 0,
    currentTemperature:
      parseNumberish(entity.attributes?.current_temperature) ??
      (parseFloat(entity.attributes?.temperature ?? '0') || 0),
    temperatureUnit: resolveClimateTemperatureUnit(entity),
    mode: resolveClimateMode(entity),
    action:
      (typeof entity.attributes?.hvac_action === 'string' && entity.attributes.hvac_action) ||
      undefined,
    supportedHvacModes: resolveClimateSupportedModes(entityId, entity),
    serviceDomain: entityId.startsWith('water_heater.') ? 'water_heater' : 'climate',
  };
}
