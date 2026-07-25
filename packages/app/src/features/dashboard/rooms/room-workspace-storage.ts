import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { notifyPersistedStateChanged } from '@navet/app/utils/persisted-state-events';
import { storage } from '@navet/app/utils/storage';
import {
  type MigrateLegacyRoomWorkspaceV2Input,
  migrateLegacyRoomWorkspaceV2,
  parseRoomWorkspaceV2,
  type ReconcileRoomWorkspaceV2Options,
  type RoomWorkspaceDiscoveredRoom,
  type RoomWorkspaceV2,
  reconcileRoomWorkspaceV2,
} from './room-workspace-v2';

export interface LoadOrMigrateRoomWorkspaceV2Options
  extends Pick<MigrateLegacyRoomWorkspaceV2Input, 'legacyAllName' | 'idFactory'> {
  persist?: boolean;
}

export function readRoomWorkspaceV2(): RoomWorkspaceV2 | null {
  return parseRoomWorkspaceV2(storage.get<unknown>(STORAGE_KEYS.roomWorkspace, null));
}

export function writeRoomWorkspaceV2(value: unknown): RoomWorkspaceV2 | null {
  const workspace = parseRoomWorkspaceV2(value);
  if (!workspace) {
    return null;
  }

  storage.set(STORAGE_KEYS.roomWorkspace, workspace);
  if (typeof window !== 'undefined') {
    notifyPersistedStateChanged(STORAGE_KEYS.roomWorkspace, workspace);
  }
  return workspace;
}

export function removeRoomWorkspaceV2(): void {
  storage.remove(STORAGE_KEYS.roomWorkspace);
  if (typeof window !== 'undefined') {
    notifyPersistedStateChanged(STORAGE_KEYS.roomWorkspace, null);
  }
}

export function loadOrMigrateRoomWorkspaceV2(
  discoveredRooms: readonly RoomWorkspaceDiscoveredRoom[],
  { persist = true, legacyAllName, idFactory }: LoadOrMigrateRoomWorkspaceV2Options = {}
): RoomWorkspaceV2 {
  const persistedWorkspace = readRoomWorkspaceV2();
  const workspace = persistedWorkspace
    ? reconcileRoomWorkspaceV2(persistedWorkspace, discoveredRooms, {
        idFactory,
      } satisfies ReconcileRoomWorkspaceV2Options)
    : migrateLegacyRoomWorkspaceV2({
        discoveredRooms,
        roomOrder: storage.get<unknown>(STORAGE_KEYS.roomOrder, []),
        hiddenRoomNames: storage.get<unknown>(STORAGE_KEYS.hiddenRooms, []),
        roomOrganization: storage.get<unknown>(STORAGE_KEYS.roomOrganization, null),
        legacyAllName,
        idFactory,
      });

  if (persist) {
    writeRoomWorkspaceV2(workspace);
  }

  return workspace;
}
