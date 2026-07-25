import { isAllRooms } from '@navet/app/constants/rooms';
import {
  parseRoomWorkspaceV2,
  type RoomWorkspaceRoomId,
  type RoomWorkspaceV2,
} from '@navet/app/features/dashboard/rooms';
import { useCallback, useEffect, useMemo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { useNavigationStore } from '../stores/navigation-store';

interface ResolvedRoomSelection {
  room: string;
  roomId: RoomWorkspaceRoomId | null;
}

function normalizeRoomName(room: string): string {
  return room.trim().toLocaleLowerCase();
}

function resolveRoomSelection(
  room: string,
  roomId: string | null,
  workspace: RoomWorkspaceV2
): ResolvedRoomSelection {
  if (isAllRooms(room)) {
    return { room, roomId: null };
  }

  const roomById = new Map(
    workspace.rooms.map((workspaceRoom) => [workspaceRoom.id, workspaceRoom])
  );
  const roomFromId = roomId ? roomById.get(roomId as RoomWorkspaceRoomId) : undefined;
  if (roomFromId) {
    return { room: roomFromId.displayName, roomId: roomFromId.id };
  }

  const normalizedRoom = normalizeRoomName(room);
  const matchingRooms = workspace.rooms.filter(
    (workspaceRoom) => normalizeRoomName(workspaceRoom.displayName) === normalizedRoom
  );

  return matchingRooms.length === 1
    ? { room: matchingRooms[0].displayName, roomId: matchingRooms[0].id }
    : { room, roomId: null };
}

/**
 * Custom hook for managing room navigation state
 * Encapsulates active room selection logic
 */
export const useRoomNavigation = (defaultRoom: string, roomWorkspace?: RoomWorkspaceV2 | null) => {
  const {
    currentRoom,
    currentRoomId,
    lastExplicitRoom,
    lastExplicitRoomId,
    setCurrentRoom,
    syncResolvedRoomState,
  } = useNavigationStore(
    useShallow((state) => ({
      currentRoom: state.currentRoom,
      currentRoomId: state.currentRoomId,
      lastExplicitRoom: state.lastExplicitRoom,
      lastExplicitRoomId: state.lastExplicitRoomId,
      setCurrentRoom: state.setCurrentRoom,
      syncResolvedRoomState: state.syncResolvedRoomState,
    }))
  );
  const parsedWorkspace = useMemo(() => parseRoomWorkspaceV2(roomWorkspace), [roomWorkspace]);
  const activeSelection = useMemo(
    () =>
      parsedWorkspace
        ? resolveRoomSelection(currentRoom || defaultRoom, currentRoomId, parsedWorkspace)
        : { room: currentRoom || defaultRoom, roomId: currentRoomId },
    [currentRoom, currentRoomId, defaultRoom, parsedWorkspace]
  );
  const preferredSelection = useMemo(
    () =>
      parsedWorkspace
        ? resolveRoomSelection(lastExplicitRoom || defaultRoom, lastExplicitRoomId, parsedWorkspace)
        : {
            room: lastExplicitRoom || defaultRoom,
            roomId: lastExplicitRoomId,
          },
    [defaultRoom, lastExplicitRoom, lastExplicitRoomId, parsedWorkspace]
  );

  useEffect(() => {
    if (!parsedWorkspace) {
      return;
    }

    syncResolvedRoomState({
      currentRoom: activeSelection.room,
      currentRoomId: activeSelection.roomId,
      lastExplicitRoom: preferredSelection.room,
      lastExplicitRoomId: preferredSelection.roomId,
    });
  }, [activeSelection, parsedWorkspace, preferredSelection, syncResolvedRoomState]);

  const changeRoom = useCallback(
    (room: string) => {
      const selection = parsedWorkspace
        ? resolveRoomSelection(room, null, parsedWorkspace)
        : { room, roomId: null };
      setCurrentRoom(selection.room, { roomId: selection.roomId });
    },
    [parsedWorkspace, setCurrentRoom]
  );

  const fallbackRoom = useCallback(
    (room: string) => {
      const selection = parsedWorkspace
        ? resolveRoomSelection(room, null, parsedWorkspace)
        : { room, roomId: null };
      setCurrentRoom(selection.room, { explicit: false, roomId: selection.roomId });
    },
    [parsedWorkspace, setCurrentRoom]
  );

  return useMemo(
    () => ({
      activeRoom: activeSelection.room,
      activeRoomId: activeSelection.roomId,
      preferredRoom: preferredSelection.room,
      preferredRoomId: preferredSelection.roomId,
      changeRoom,
      fallbackRoom,
    }),
    [activeSelection, changeRoom, fallbackRoom, preferredSelection]
  );
};
