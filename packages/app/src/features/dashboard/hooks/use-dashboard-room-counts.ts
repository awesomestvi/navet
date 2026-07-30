import { isAllRooms } from '@navet/app/constants/rooms';
import type { PlatformRoom } from '@navet/app/platform/types';
import { useMemo } from 'react';

function serializeItemCountsByRoom(rooms: PlatformRoom[]) {
  return JSON.stringify(
    rooms.flatMap((room) =>
      !room.name || isAllRooms(room.name)
        ? []
        : ([[room.name, room.canonicalMemberIds.length]] satisfies Array<[string, number]>)
    )
  );
}

function deserializeItemCountsByRoom(serializedCounts: string) {
  return new Map<string, number>(
    JSON.parse(serializedCounts) as Array<[room: string, count: number]>
  );
}

export function useDashboardRoomCounts(allRooms: PlatformRoom[], visibleRooms: PlatformRoom[]) {
  const roomItemCountsKey = useMemo(() => serializeItemCountsByRoom(allRooms), [allRooms]);
  const roomItemCounts = useMemo(
    () => deserializeItemCountsByRoom(roomItemCountsKey),
    [roomItemCountsKey]
  );

  const visibleRoomItemCountsKey = useMemo(
    () => serializeItemCountsByRoom(visibleRooms),
    [visibleRooms]
  );
  const visibleRoomItemCounts = useMemo(
    () => deserializeItemCountsByRoom(visibleRoomItemCountsKey),
    [visibleRoomItemCountsKey]
  );

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
