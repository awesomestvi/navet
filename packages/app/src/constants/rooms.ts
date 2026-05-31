export const ALL_ROOMS_ID = 'All';
export const HOME_WIDGET_ROOM = '__home__';
export const ENERGY_WIDGET_ROOM = '__energy__';

export function isAllRooms(room: string | null | undefined): room is typeof ALL_ROOMS_ID {
  return room === ALL_ROOMS_ID;
}

export function isHomeWidgetRoom(room: string | null | undefined): room is typeof HOME_WIDGET_ROOM {
  return room === HOME_WIDGET_ROOM;
}

export function toHomeWidgetRoom(room: string | null | undefined): string {
  return !room || isAllRooms(room) ? HOME_WIDGET_ROOM : room;
}

export function getDashboardRoomLabel(room: string, allRoomsLabel: string): string {
  return isAllRooms(room) || isHomeWidgetRoom(room) ? allRoomsLabel : room;
}
