import { useMemo } from 'react';
import { isAllRooms } from '@/app/constants/rooms';

type RoomInput = string | { name: string; key?: string; canonicalId?: string; area_id?: string };
const EMPTY_DISCOVERED_ROOMS: RoomInput[] = [];

function toRoomName(room: RoomInput): string {
  return typeof room === 'string' ? room : room.name;
}

function toRoomKey(room: RoomInput): string {
  if (typeof room === 'string') {
    return room.trim().toLocaleLowerCase();
  }

  if (typeof room.key === 'string' && room.key.length > 0) {
    return room.key;
  }

  if (typeof room.canonicalId === 'string' && room.canonicalId.length > 0) {
    return room.canonicalId;
  }

  return room.name.trim().toLocaleLowerCase();
}

export function useAvailableRooms(
  baseRooms: RoomInput[],
  discoveredRooms: RoomInput[] = EMPTY_DISCOVERED_ROOMS
) {
  const areaRooms = useMemo(
    () =>
      baseRooms
        .map((room) => ({
          key: toRoomKey(room),
          name: toRoomName(room).trim(),
        }))
        .filter((room) => room.name && !isAllRooms(room.name)),
    [baseRooms]
  );

  const availableRooms = useMemo(() => {
    const roomMap = new Map<string, string>();

    for (const room of areaRooms) {
      roomMap.set(room.key, room.name);
    }

    for (const room of discoveredRooms) {
      const key = toRoomKey(room);
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
