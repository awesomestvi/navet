import type { BatteryListDevice } from '@navet/app/features/dashboard/components/widgets/battery-list';
import { getBatteryDisplayModel } from '@navet/app/features/sensors/components/battery-display-model';
import type { DeviceWithType } from '@navet/app/types/device.types';

export function isSecurityBatteryDevice(device: DeviceWithType) {
  return (
    device.type === 'sensors' &&
    (device.securityKind === 'battery' || device.deviceClass === 'battery')
  );
}

export function buildSecurityBatteryRows(devices: DeviceWithType[]): BatteryListDevice[] {
  const rows = new Map<string, BatteryListDevice>();
  for (const device of devices) {
    if (device.type !== 'sensors' || !isSecurityBatteryDevice(device)) continue;
    const battery = getBatteryDisplayModel(
      device.value,
      device.unit,
      device.status ?? 'measurement',
      device.securitySeverity
    );
    const sourceId = device.sourceDeviceId ?? device.underlyingDeviceId;
    const key = sourceId ? `${device.providerId}:${sourceId}` : device.id;
    const previous = rows.get(key);
    const preferReading = !previous || (previous.level === null && battery.level !== null);
    rows.set(key, {
      id: preferReading ? device.id : previous.id,
      name: preferReading ? (device.sourceDeviceName ?? device.name) : previous.name,
      level: preferReading ? battery.level : previous.level,
      status:
        previous?.status === 'low' || battery.status === 'low'
          ? 'low'
          : previous?.status === 'okay' || battery.status === 'okay'
            ? 'okay'
            : 'unavailable',
      entityIds: [...(previous?.entityIds ?? []), device.id],
    });
  }
  return [...rows.values()].sort(
    (left, right) =>
      Number(right.status === 'low') - Number(left.status === 'low') ||
      Number(left.status === 'unavailable') - Number(right.status === 'unavailable') ||
      (left.level ?? 101) - (right.level ?? 101) ||
      left.name.localeCompare(right.name)
  );
}

export function collapseSecurityBatteryDevices(devices: DeviceWithType[]): DeviceWithType[] {
  const batteryRows = buildSecurityBatteryRows(devices);
  const byId = new Map(devices.map((device) => [device.id, device]));
  const batteries = batteryRows.flatMap((row): DeviceWithType[] => {
    const device = byId.get(row.id);
    return device
      ? [
          {
            ...device,
            securitySeverity:
              row.status === 'low'
                ? 'warning'
                : row.status === 'unavailable'
                  ? 'unknown'
                  : 'normal',
          },
        ]
      : [];
  });
  return [...devices.filter((device) => !isSecurityBatteryDevice(device)), ...batteries];
}
