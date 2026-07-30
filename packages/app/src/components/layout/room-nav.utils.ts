import { ALL_ROOMS_ID, isAllRooms } from '@navet/app/constants/rooms';

export interface RoomNavigationGroup {
  id: string;
  name: string;
  rooms: string[];
  symbol?: string;
}

export function getVisibleRoomNavRooms(rooms: string[]): string[] {
  return [ALL_ROOMS_ID, ...rooms.filter((room) => !isAllRooms(room))];
}

export function filterHiddenRooms(rooms: string[], hiddenRoomNames: string[]): string[] {
  const hiddenRooms = new Set(hiddenRoomNames);
  return rooms.filter((room) => !hiddenRooms.has(room));
}
