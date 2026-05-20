import { useEffect, useRef } from 'react';
import { ALL_ROOMS_ID, isAllRooms } from '@/app/constants/rooms';

export function useDashboardRoomNavigation(
  activeRoom: string,
  rooms: string[],
  changeRoom: (room: string) => void,
  hassEntitiesHydrated: boolean,
  devicesLoaded: boolean,
  registriesHydrated: boolean
) {
  const previousRoomsRef = useRef<string[]>(rooms);

  useEffect(() => {
    if (isAllRooms(activeRoom) || rooms.includes(activeRoom)) {
      previousRoomsRef.current = rooms;
      return;
    }

    if (!hassEntitiesHydrated || !devicesLoaded || !registriesHydrated) {
      return;
    }

    if (rooms.length === 0) {
      changeRoom(ALL_ROOMS_ID);
      previousRoomsRef.current = rooms;
      return;
    }

    const previousRooms = previousRoomsRef.current;
    const removedRoomIndex = previousRooms.indexOf(activeRoom);
    const nextRoom =
      (removedRoomIndex >= 0
        ? (previousRooms
            .slice(removedRoomIndex + 1)
            .find((room) => room !== activeRoom && rooms.includes(room)) ??
          previousRooms
            .slice(0, removedRoomIndex)
            .reverse()
            .find((room) => room !== activeRoom && rooms.includes(room)))
        : undefined) ??
      rooms[0] ??
      ALL_ROOMS_ID;

    changeRoom(nextRoom);
    previousRoomsRef.current = rooms;
  }, [activeRoom, changeRoom, devicesLoaded, hassEntitiesHydrated, registriesHydrated, rooms]);
}
