import { normalizeVacuumStatus } from '@navet/app/features/vacuum';
import type { VacuumDevice } from '@navet/app/types/device.types';
import type { HassEntity } from 'home-assistant-js-websocket';
import { parseNumberish } from '../entity-utils';

function readFirst(attrs: HassEntity['attributes'], keys: string[]): unknown {
  for (const key of keys) {
    const value = attrs?.[key];
    if (value !== undefined && value !== null && value !== '') return value;
  }

  return undefined;
}

export function mapVacuumDevice(
  entityId: string,
  entity: HassEntity,
  name: string,
  room: string
): VacuumDevice {
  const batteryLevel =
    parseNumberish(entity.attributes?.battery_level) ??
    parseNumberish(entity.attributes?.battery) ??
    parseNumberish(entity.attributes?.battery_percent);
  const cleanedAreaValue =
    parseNumberish(entity.attributes?.cleaned_area) ??
    parseNumberish(entity.attributes?.cleaned_area_today) ??
    parseNumberish(entity.attributes?.last_cleaned_area);
  const cleaningTimeMinutes =
    parseNumberish(entity.attributes?.cleaning_time) ??
    parseNumberish(entity.attributes?.clean_time) ??
    parseNumberish(entity.attributes?.cleaning_duration);
  const nextCleaning = readFirst(entity.attributes, [
    'next_cleaning',
    'next_clean',
    'scheduled_start',
    'next_run',
  ]);
  const waterLevel = readFirst(entity.attributes, [
    'water_level',
    'water_tank_level',
    'mop_water_level',
    'tank_level',
  ]);
  const binLevel = readFirst(entity.attributes, [
    'bin_level',
    'dustbin_level',
    'dust_bin_level',
    'dust_level',
    'bin_space',
    'bin_fullness',
  ]);

  const normalizedStatus = normalizeVacuumStatus(
    readFirst(entity.attributes, ['status', 'state', 'activity']) ?? entity.state
  );

  return {
    id: entityId,
    name,
    room,
    size: 'medium',
    status: normalizedStatus,
    battery: typeof batteryLevel === 'number' ? Math.max(0, Math.min(100, batteryLevel)) : 0,
    cleanedArea:
      typeof cleanedAreaValue === 'number'
        ? `${cleanedAreaValue.toFixed(cleanedAreaValue >= 10 ? 0 : 1)} m²`
        : undefined,
    cleaningTime:
      typeof cleaningTimeMinutes === 'number'
        ? `${Math.max(0, Math.round(cleaningTimeMinutes))} min`
        : undefined,
    nextCleaning: typeof nextCleaning === 'string' ? nextCleaning : undefined,
    waterLevel:
      typeof waterLevel === 'string' || typeof waterLevel === 'number' ? waterLevel : undefined,
    binLevel: typeof binLevel === 'string' || typeof binLevel === 'number' ? binLevel : undefined,
  };
}
