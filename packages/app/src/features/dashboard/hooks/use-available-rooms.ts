import { isAllRooms } from '@navet/app/constants/rooms';
import { normalizeRoomName } from '@navet/app/utils/room-name';
import { useMemo } from 'react';

type RoomInput = string | { name: string; key?: string; canonicalId?: string; area_id?: string };
const EMPTY_DISCOVERED_ROOMS: RoomInput[] = [];

function toRoomName(room: RoomInput): string {
  return typeof room === 'string' ? room : room.name;
}

export function useAvailableRooms(
  baseRooms: RoomInput[],
  discoveredRooms: RoomInput[] = EMPTY_DISCOVERED_ROOMS
) {
  const areaRooms = useMemo(() => {
    const roomsByKey = new Map<string, { key: string; name: string }>();
    for (const room of baseRooms) {
      const name = toRoomName(room).trim();
      const key = normalizeRoomName(name);
      if (name && !isAllRooms(name) && !roomsByKey.has(key)) roomsByKey.set(key, { key, name });
    }
    return [...roomsByKey.values()];
  }, [baseRooms]);

  const availableRooms = useMemo(() => {
    const roomMap = new Map<string, string>();

    for (const room of areaRooms) {
      if (!roomMap.has(room.key)) roomMap.set(room.key, room.name);
    }

    for (const room of discoveredRooms) {
      const key = normalizeRoomName(toRoomName(room));
      const name = toRoomName(room).trim();
      if (!name || isAllRooms(name) || roomMap.has(key)) {
        continue;
      }
      roomMap.set(key, name);
    }

    return Array.from(roomMap.values());
  }, [areaRooms, discoveredRooms]);

  return { areaRooms: areaRooms.map((room) => room.name), availableRooms };
}
