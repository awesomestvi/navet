import { normalizeRoomName } from '@navet/app/utils/room-name';
import {
  getRoomWorkspaceRoomsInDisplayOrderV2,
  parseRoomWorkspaceV2,
  type RoomWorkspaceV2,
} from '../rooms';

export interface DashboardRoomPreferences {
  hiddenRoomNames: string[];
  rooms: string[];
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
    const availableRoomNames = new Map(
      availableRooms.map((room) => [normalizeRoomName(room), room])
    );
    const preserved = Array.from(
      new Set(
        roomOrder.flatMap((room) => {
          const displayName = availableRoomNames.get(normalizeRoomName(room));
          return displayName ? [displayName] : [];
        })
      )
    );
    const preservedRoomNames = new Set(preserved.map(normalizeRoomName));

    return {
      rooms: [
        ...preserved,
        ...availableRooms.filter((room) => !preservedRoomNames.has(normalizeRoomName(room))),
      ],
      hiddenRoomNames: hiddenRoomNames.map(
        (room) => availableRoomNames.get(normalizeRoomName(room)) ?? room
      ),
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
