import { useMemo } from 'react';
import type { PlatformRoom } from '@/app/platform/types';
import {
  buildAggregatedRooms,
  buildAggregatedRoomsFromNavetDevices,
} from '../utils/provider-rooms';
import { useDevices } from './use-devices';
import { useNavetDevices } from './use-navet-devices';

export function useAggregatedRooms(): PlatformRoom[] {
  const navetDevices = useNavetDevices();
  const devices = useDevices();

  return useMemo(() => {
    const canonicalRooms = buildAggregatedRoomsFromNavetDevices(navetDevices);
    const legacyRooms = buildAggregatedRooms(devices);
    const roomMap = new Map(canonicalRooms.map((room) => [room.key, room]));

    for (const room of legacyRooms) {
      const existing = roomMap.get(room.key);

      if (!existing) {
        roomMap.set(room.key, room);
        continue;
      }

      for (const providerId of room.providerIds) {
        if (!existing.providerIds.includes(providerId)) {
          existing.providerIds.push(providerId);
        }
      }

      for (const memberId of room.canonicalMemberIds) {
        if (!existing.canonicalMemberIds.includes(memberId)) {
          existing.canonicalMemberIds.push(memberId);
        }
      }
    }

    return Array.from(roomMap.values()).sort((left, right) => left.name.localeCompare(right.name));
  }, [devices, navetDevices]);
}
