import { ALL_ROOMS_ID, isAllRooms } from '@navet/app/constants/rooms';
import { roomNamesMatch } from '@navet/app/utils/room-name';
import { useCallback, useEffect, useRef, useState } from 'react';

const STANDALONE_RESUME_GRACE_MS = 1500;

export function useDashboardRoomNavigation(
  activeRoom: string,
  preferredRoom: string,
  rooms: string[],
  changeRoom: (room: string) => void,
  fallbackRoom: (room: string) => void,
  entitiesHydrated: boolean,
  devicesLoaded: boolean,
  registriesHydrated: boolean,
  connected: boolean,
  connecting: boolean,
  standaloneMode: boolean
) {
  const previousRoomsRef = useRef<string[]>(rooms);
  const [resumeGraceActive, setResumeGraceActive] = useState(false);
  const resumeGraceTimeoutRef = useRef<number | null>(null);
  const resumeGracePendingRef = useRef(false);
  const wasHiddenRef = useRef(false);
  const reconnectPendingRef = useRef(false);

  const startResumeGrace = useCallback(() => {
    if (!standaloneMode || typeof window === 'undefined') {
      return;
    }

    if (resumeGraceTimeoutRef.current !== null) {
      window.clearTimeout(resumeGraceTimeoutRef.current);
    }

    setResumeGraceActive(true);
    resumeGracePendingRef.current = true;
    resumeGraceTimeoutRef.current = window.setTimeout(() => {
      setResumeGraceActive(false);
      resumeGracePendingRef.current = false;
      resumeGraceTimeoutRef.current = null;
    }, STANDALONE_RESUME_GRACE_MS);
  }, [standaloneMode]);

  useEffect(() => {
    if (!standaloneMode || typeof document === 'undefined') {
      return;
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        wasHiddenRef.current = true;
        return;
      }

      if (wasHiddenRef.current) {
        wasHiddenRef.current = false;
        startResumeGrace();
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    return () => {
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [standaloneMode, startResumeGrace]);

  useEffect(() => {
    if (!standaloneMode) {
      return;
    }

    if (connecting || !connected) {
      reconnectPendingRef.current = true;
      return;
    }

    if (reconnectPendingRef.current) {
      reconnectPendingRef.current = false;
      startResumeGrace();
    }
  }, [connected, connecting, standaloneMode, startResumeGrace]);

  useEffect(() => {
    return () => {
      if (resumeGraceTimeoutRef.current !== null && typeof window !== 'undefined') {
        window.clearTimeout(resumeGraceTimeoutRef.current);
      }
      resumeGracePendingRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (
      standaloneMode &&
      !isAllRooms(preferredRoom) &&
      rooms.some((room) => roomNamesMatch(room, preferredRoom)) &&
      !roomNamesMatch(activeRoom, preferredRoom)
    ) {
      changeRoom(preferredRoom);
      previousRoomsRef.current = rooms;
      return;
    }

    if (isAllRooms(activeRoom) || rooms.some((room) => roomNamesMatch(room, activeRoom))) {
      previousRoomsRef.current = rooms;
      return;
    }

    if (!entitiesHydrated || !devicesLoaded || !registriesHydrated) {
      return;
    }

    if (
      standaloneMode &&
      (resumeGraceActive || resumeGracePendingRef.current) &&
      !isAllRooms(preferredRoom) &&
      roomNamesMatch(activeRoom, preferredRoom)
    ) {
      return;
    }

    if (rooms.length === 0) {
      fallbackRoom(ALL_ROOMS_ID);
      previousRoomsRef.current = rooms;
      return;
    }

    const previousRooms = previousRoomsRef.current;
    const removedRoomIndex = previousRooms.findIndex((room) => roomNamesMatch(room, activeRoom));
    const nextRoom =
      removedRoomIndex >= 0
        ? (previousRooms
            .slice(removedRoomIndex + 1)
            .find(
              (room) =>
                !roomNamesMatch(room, activeRoom) &&
                rooms.some((name) => roomNamesMatch(name, room))
            ) ??
          previousRooms
            .slice(0, removedRoomIndex)
            .reverse()
            .find(
              (room) =>
                !roomNamesMatch(room, activeRoom) &&
                rooms.some((name) => roomNamesMatch(name, room))
            ) ??
          ALL_ROOMS_ID)
        : ALL_ROOMS_ID;

    fallbackRoom(nextRoom);
    previousRoomsRef.current = rooms;
  }, [
    activeRoom,
    changeRoom,
    devicesLoaded,
    entitiesHydrated,
    fallbackRoom,
    preferredRoom,
    registriesHydrated,
    resumeGraceActive,
    rooms,
    standaloneMode,
  ]);
}
