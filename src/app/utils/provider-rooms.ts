import type { NavetDevice } from '@/app/core/navet';
import type { PlatformRoom } from '@/app/platform/types';
import type { DeviceCollection } from '@/app/types/device.types';
import { getDeviceRoomLabel } from './device-location';

function normalizeRoomName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

export function buildAggregatedRooms(devices: DeviceCollection): PlatformRoom[] {
  const roomMap = new Map<string, PlatformRoom>();

  for (const deviceArray of Object.values(devices)) {
    for (const device of deviceArray) {
      const roomName = getDeviceRoomLabel(device);
      const roomKey = normalizeRoomName(roomName);
      const canonicalId = device.canonicalId ?? device.id;
      const providerId = device.providerId ?? 'home_assistant';
      const existing = roomMap.get(roomKey);

      if (existing) {
        if (!existing.providerIds.includes(providerId)) {
          existing.providerIds.push(providerId);
        }
        if (!existing.canonicalMemberIds.includes(canonicalId)) {
          existing.canonicalMemberIds.push(canonicalId);
        }
        continue;
      }

      roomMap.set(roomKey, {
        id: roomKey,
        key: roomKey,
        name: roomName,
        providerIds: [providerId],
        canonicalMemberIds: [canonicalId],
      });
    }
  }

  return Array.from(roomMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}

export function buildAggregatedRoomsFromNavetDevices(devices: NavetDevice[]): PlatformRoom[] {
  const roomMap = new Map<string, PlatformRoom>();

  for (const device of devices) {
    const roomKey = normalizeRoomName(device.room);
    const existing = roomMap.get(roomKey);

    if (existing) {
      if (!existing.providerIds.includes(device.providerId)) {
        existing.providerIds.push(device.providerId);
      }
      if (!existing.canonicalMemberIds.includes(device.canonicalId)) {
        existing.canonicalMemberIds.push(device.canonicalId);
      }
      continue;
    }

    roomMap.set(roomKey, {
      id: roomKey,
      key: roomKey,
      name: device.room,
      providerIds: [device.providerId],
      canonicalMemberIds: [device.canonicalId],
    });
  }

  return Array.from(roomMap.values()).sort((left, right) => left.name.localeCompare(right.name));
}
