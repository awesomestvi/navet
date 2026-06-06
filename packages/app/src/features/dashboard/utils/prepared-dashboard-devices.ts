import { getDeviceTypeLabel } from '@navet/app/constants/device-type-labels';
import type { TranslateFn } from '@navet/app/hooks';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { getDeviceRoomLabel } from '@navet/app/utils/device-location';
import { getProviderEntityTypeLabel } from '@navet/app/utils/provider-entity-label';

export interface PreparedDashboardDevice {
  device: DeviceWithType;
  id: string;
  name: string;
  room: string;
  typeLabel: string;
  searchText: string;
}

export function buildPreparedDashboardDevices(
  deviceMap: Map<string, DeviceWithType>,
  t: TranslateFn,
  connectedProviderCount: number
): PreparedDashboardDevice[] {
  const devices: PreparedDashboardDevice[] = [];

  for (const device of deviceMap.values()) {
    const room = getDeviceRoomLabel(device);
    const name = typeof device.name === 'string' ? device.name : device.id;
    const typeLabel =
      ('entityType' in device && typeof device.entityType === 'string' && device.entityType) ||
      getDeviceTypeLabel(device.type, t);
    const providerTypeLabel =
      getProviderEntityTypeLabel(device.id, typeLabel, connectedProviderCount > 1) ?? typeLabel;

    devices.push({
      device,
      id: device.id,
      name,
      room,
      typeLabel: providerTypeLabel,
      searchText: `${name} ${room} ${providerTypeLabel} ${device.id}`.toLowerCase(),
    });
  }

  return devices;
}
