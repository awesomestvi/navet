import { getClimateSensorGroup } from '@navet/app/core/climate-sensor-group';
import type { DeviceWithType } from '@navet/app/types/device.types';

export type ClimateDashboardGroupKey =
  | 'climate'
  | 'fans'
  | 'temperature'
  | 'humidity'
  | 'airQuality'
  | 'pressure';

export function getClimateDashboardGroup(device: DeviceWithType): ClimateDashboardGroupKey | null {
  if (device.type === 'fans') {
    return 'fans';
  }

  if (device.type === 'climate' || device.type === 'hvac') {
    return 'climate';
  }

  if (
    device.type === 'switches' &&
    (device.serviceDomain === 'humidifier' ||
      String(device.entityType ?? '').toLowerCase() === 'humidifier' ||
      String(device.entityType ?? '').toLowerCase() === 'dehumidifier')
  ) {
    return 'humidity';
  }

  if (device.type !== 'sensors') {
    return null;
  }

  return getClimateSensorGroup(device.deviceClass);
}
