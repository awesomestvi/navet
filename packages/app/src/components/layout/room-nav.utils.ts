import { ALL_ROOMS_ID } from '@navet/app/constants/rooms';

export interface RoomNavigationGroup {
  id: string;
  name: string;
  rooms: string[];
  symbol?: string;
}

export function getVisibleRoomNavRooms(rooms: string[]): string[] {
  return [ALL_ROOMS_ID, ...rooms];
}

export function filterHiddenRooms(rooms: string[], hiddenRoomNames: string[]): string[] {
  const hiddenRooms = new Set(hiddenRoomNames);
  return rooms.filter((room) => !hiddenRooms.has(room));
}
