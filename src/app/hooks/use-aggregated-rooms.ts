import { useMemo } from 'react';
import type { PlatformRoom } from '@/app/platform/types';
import { useNavetRooms } from './use-navet-devices';

export function useAggregatedRooms(): PlatformRoom[] {
  const navetRooms = useNavetRooms();

  return useMemo<PlatformRoom[]>(
    () =>
      navetRooms.map((room) => ({
        id: room.id,
        key: room.normalizedName,
        name: room.name,
        providerIds: [room.providerId],
        canonicalMemberIds: [...room.memberIds],
      })),
    [navetRooms]
  );
}
