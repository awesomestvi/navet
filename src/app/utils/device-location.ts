import type { Device, DeviceCollection, DeviceWithType } from '@/app/types/device.types';

type LocatableDevice = Device | DeviceWithType;
export const UNKNOWN_ROOM_LABEL = 'Unassigned';

export function getDeviceRoom(device: LocatableDevice): string | null {
  if ('room' in device && typeof device.room === 'string' && device.room.length > 0) {
    return device.room;
  }

  if ('location' in device && typeof device.location === 'string' && device.location.length > 0) {
    return device.location;
  }

  return null;
}

export function getDeviceRoomLabel(device: LocatableDevice): string {
  return getDeviceRoom(device) ?? UNKNOWN_ROOM_LABEL;
}

export function getAllRooms(devices: DeviceCollection): string[] {
  const rooms = new Set<string>();

  Object.values(devices).forEach((deviceArray) => {
    (deviceArray as Device[]).forEach((device: Device) => {
      rooms.add(getDeviceRoomLabel(device));
    });
  });

  return Array.from(rooms).sort();
}
