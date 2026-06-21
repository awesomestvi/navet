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

  switch (String(device.deviceClass ?? '').toLowerCase()) {
    case 'temperature':
      return 'temperature';
    case 'humidity':
      return 'humidity';
    case 'air_quality':
    case 'carbon_dioxide':
      return 'airQuality';
    case 'pressure':
      return 'pressure';
    default:
      return null;
  }
}
