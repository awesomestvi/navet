import { useEffect, useRef } from 'react';

export function useDashboardRoomNavigation(
  activeRoom: string,
  rooms: string[],
  changeRoom: (room: string) => void,
  hassEntitiesHydrated: boolean,
  devicesLoaded: boolean
) {
  const previousRoomsRef = useRef<string[]>(rooms);

  useEffect(() => {
    if (activeRoom === 'All' || rooms.includes(activeRoom)) {
      previousRoomsRef.current = rooms;
      return;
    }

    if (rooms.length === 0) {
      if (!hassEntitiesHydrated || !devicesLoaded) {
        return;
      }
      changeRoom('All');
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
      'All';

    changeRoom(nextRoom);
    previousRoomsRef.current = rooms;
  }, [activeRoom, changeRoom, devicesLoaded, hassEntitiesHydrated, rooms]);
}
