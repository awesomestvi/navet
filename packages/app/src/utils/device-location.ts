import type { Device, DeviceCollection, DeviceWithType } from '@navet/app/types/device.types';
import { normalizeRoomName } from './room-name';

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
  const rooms = new Map<string, string>();

  Object.values(devices).forEach((deviceArray) => {
    (deviceArray as Device[]).forEach((device: Device) => {
      const room = getDeviceRoomLabel(device);
      const key = normalizeRoomName(room);
      if (!rooms.has(key)) rooms.set(key, room);
    });
  });

  return Array.from(rooms.values()).sort();
}
