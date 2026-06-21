import type { ClimateDevice } from '@navet/app/types/device.types';
import type { HassEntity } from 'home-assistant-js-websocket';
import {
  parseNumberish,
  resolveClimateTargetTemperature,
  resolveClimateTemperatureUnit,
} from '../entity-utils';

function parseSupportedClimateModes(value: unknown): string[] | undefined {
  if (!Array.isArray(value)) {
    return undefined;
  }

  return value.filter((mode): mode is string => typeof mode === 'string');
}

function resolveClimateSupportedModes(entityId: string, entity: HassEntity): string[] | undefined {
  const supportedModes = parseSupportedClimateModes(
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

export function mapClimateDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string,
  fallbackTemperatureUnit?: unknown
): ClimateDevice {
  const targetTemperature = resolveClimateTargetTemperature(entity);

  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    temperature: targetTemperature ?? parseNumberish(entity.attributes?.current_temperature) ?? 0,
    currentTemperature:
      parseNumberish(entity.attributes?.current_temperature) ?? targetTemperature ?? 0,
    temperatureUnit: resolveClimateTemperatureUnit(entity, fallbackTemperatureUnit),
    mode: resolveClimateMode(entity),
    action:
      (typeof entity.attributes?.hvac_action === 'string' && entity.attributes.hvac_action) ||
      undefined,
    supportedClimateModes: resolveClimateSupportedModes(entityId, entity),
    supportedHvacModes: resolveClimateSupportedModes(entityId, entity),
    serviceDomain: entityId.startsWith('water_heater.') ? 'water_heater' : 'climate',
  };
}
