import {
  getRoomWorkspaceRoomsInDisplayOrderV2,
  parseRoomWorkspaceV2,
  type RoomWorkspaceV2,
} from '../rooms';

export interface DashboardRoomPreferences {
  hiddenRoomNames: string[];
  rooms: string[];
}

function normalizeRoomName(name: string): string {
  return name.trim().toLocaleLowerCase();
}

/**
 * Projects stable Room Workspace V2 metadata onto the dashboard's current
 * name-based navigation contract. The legacy preferences remain the fallback
 * until a valid V2 workspace exists.
 */
export function resolveDashboardRoomPreferences({
  availableRooms,
  hiddenRoomNames,
  roomOrder,
  workspace,
}: {
  availableRooms: readonly string[];
  hiddenRoomNames: readonly string[];
  roomOrder: readonly string[];
  workspace: RoomWorkspaceV2 | null;
}): DashboardRoomPreferences {
  const parsedWorkspace = parseRoomWorkspaceV2(workspace);
  if (!parsedWorkspace) {
    const availableRoomNames = new Set(availableRooms);
    const preserved = roomOrder.filter((room) => availableRoomNames.has(room));
    const preservedRoomNames = new Set(preserved);

    return {
      rooms: [...preserved, ...availableRooms.filter((room) => !preservedRoomNames.has(room))],
      hiddenRoomNames: [...hiddenRoomNames],
    };
  }

  const workspaceRooms = getRoomWorkspaceRoomsInDisplayOrderV2(parsedWorkspace)
    .map((room, displayOrder) => ({ displayOrder, room }))
    .sort((left, right) => {
      const leftFavorite = left.room.metadata.favoriteRank;
      const rightFavorite = right.room.metadata.favoriteRank;

      if (leftFavorite !== undefined || rightFavorite !== undefined) {
        if (leftFavorite === undefined) {
          return 1;
        }
        if (rightFavorite === undefined) {
          return -1;
        }
        return leftFavorite - rightFavorite || left.displayOrder - right.displayOrder;
      }

      return left.displayOrder - right.displayOrder;
    });

  const seenRoomNames = new Set<string>();
  const rooms: string[] = [];
  const effectiveHiddenRoomNames: string[] = [];

  for (const { room } of workspaceRooms) {
    const roomName = room.displayName.trim();
    const normalizedRoomName = normalizeRoomName(roomName);
    if (!roomName || seenRoomNames.has(normalizedRoomName)) {
      continue;
    }

    seenRoomNames.add(normalizedRoomName);
    rooms.push(roomName);
    if (room.metadata.visibility === 'hidden') {
      effectiveHiddenRoomNames.push(roomName);
    }
  }

  for (const roomName of availableRooms) {
    const normalizedRoomName = normalizeRoomName(roomName);
    if (!normalizedRoomName || seenRoomNames.has(normalizedRoomName)) {
      continue;
    }

    seenRoomNames.add(normalizedRoomName);
    rooms.push(roomName);
  }

  return {
    rooms,
    hiddenRoomNames: effectiveHiddenRoomNames,
  };
}
