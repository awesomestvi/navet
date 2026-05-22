import type { HassEntity } from 'home-assistant-js-websocket';
import { normalizeTemperatureUnit } from '../../utils/temperature';

export function resolveHomeAssistantTemperatureUnit(
  config: { unit_system?: { temperature?: unknown } } | null | undefined
) {
  return normalizeTemperatureUnit(config?.unit_system?.temperature);
}

export function resolveClimateTemperatureUnit(
  entity: HassEntity | undefined,
  fallbackUnit?: unknown
) {
  if (!entity) {
    return normalizeTemperatureUnit(fallbackUnit);
  }

  return (
    normalizeTemperatureUnit(entity.attributes?.unit_of_measurement) ??
    normalizeTemperatureUnit(entity.attributes?.temperature_unit) ??
    normalizeTemperatureUnit(entity.attributes?.native_temperature_unit) ??
    normalizeTemperatureUnit(entity.attributes?.native_unit_of_measurement) ??
    normalizeTemperatureUnit(fallbackUnit)
  );
}
