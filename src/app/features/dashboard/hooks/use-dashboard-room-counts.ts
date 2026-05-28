import { useMemo } from 'react';
import { isAllRooms } from '@/app/constants/rooms';
import type { PlatformRoom } from '@/app/platform/types';

function countItemsByRoom(rooms: PlatformRoom[]) {
  const counts = new Map<string, number>();

  for (const room of rooms) {
    if (!room.name || isAllRooms(room.name)) {
      continue;
    }

    counts.set(room.name, room.canonicalMemberIds.length);
  }

  return counts;
}

export function useDashboardRoomCounts(allRooms: PlatformRoom[], visibleRooms: PlatformRoom[]) {
  const roomItemCounts = useMemo(() => countItemsByRoom(allRooms), [allRooms]);

  const visibleRoomItemCounts = useMemo(() => countItemsByRoom(visibleRooms), [visibleRooms]);

  const roomHiddenItemCounts = useMemo(() => {
    const counts = new Map<string, number>();
    roomItemCounts.forEach((totalCount, room) => {
      const visibleCount = visibleRoomItemCounts.get(room) ?? 0;
      const hiddenCount = Math.max(0, totalCount - visibleCount);
      if (hiddenCount > 0) {
        counts.set(room, hiddenCount);
      }
    });
    return counts;
  }, [roomItemCounts, visibleRoomItemCounts]);

  return {
    roomItemCounts,
    visibleRoomItemCounts,
    roomHiddenItemCounts,
  };
}
