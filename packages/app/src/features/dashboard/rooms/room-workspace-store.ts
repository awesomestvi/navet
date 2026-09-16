import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { useEntityRoomOverridesStore } from '@navet/app/stores/entity-room-overrides-store';
import { PERSISTED_STATE_EVENT } from '@navet/app/utils/persisted-state-events';
import { normalizeRoomName } from '@navet/app/utils/room-name';
import { create } from 'zustand';
import {
  type LoadOrMigrateRoomWorkspaceV2Options,
  loadOrMigrateRoomWorkspaceV2,
  readRoomWorkspaceV2,
  removeRoomWorkspaceV2,
  writeRoomWorkspaceV2,
} from './room-workspace-storage';
import {
  parseRoomWorkspaceV2,
  type RoomWorkspaceDiscoveredRoom,
  type RoomWorkspaceV2,
} from './room-workspace-v2';

interface RoomWorkspaceStore {
  workspace: RoomWorkspaceV2 | null;
  initialize: (
    discoveredRooms: readonly RoomWorkspaceDiscoveredRoom[],
    options?: LoadOrMigrateRoomWorkspaceV2Options
  ) => RoomWorkspaceV2;
  replaceWorkspace: (workspace: unknown) => RoomWorkspaceV2 | null;
  resetWorkspace: () => void;
}

interface PersistedRoomWorkspaceEventDetail {
  key?: string;
  value?: unknown;
}

export const useRoomWorkspaceStore = create<RoomWorkspaceStore>((set, get) => ({
  workspace: readRoomWorkspaceV2(),
  initialize: (discoveredRooms, options) => {
    const previousWorkspace = readRoomWorkspaceV2() ?? get().workspace;
    const workspace = loadOrMigrateRoomWorkspaceV2(discoveredRooms, options);
    if (previousWorkspace && options?.persist !== false) {
      const currentRoomIds = new Set(workspace.rooms.map((room) => room.id));
      const redirects = new Map<string, string>();
      for (const previousRoom of previousWorkspace.rooms) {
        if (currentRoomIds.has(previousRoom.id)) continue;
        const target =
          workspace.rooms.find((room) =>
            room.sourceRefs.some((ref) =>
              previousRoom.sourceRefs.some(
                (previousRef) => previousRef.canonicalId === ref.canonicalId
              )
            )
          ) ??
          workspace.rooms.find(
            (room) =>
              normalizeRoomName(room.displayName) === normalizeRoomName(previousRoom.displayName)
          );
        if (target) redirects.set(previousRoom.id, target.id);
      }
      const overrides = useEntityRoomOverridesStore.getState();
      if (Object.values(overrides.roomIdsByEntityId).some((id) => redirects.has(id))) {
        overrides.replaceRoomOverrides(
          Object.fromEntries(
            Object.entries(overrides.roomIdsByEntityId).map(([entityId, roomId]) => [
              entityId,
              redirects.get(roomId) ?? roomId,
            ])
          )
        );
      }
    }
    set({ workspace });
    return workspace;
  },
  replaceWorkspace: (value) => {
    const workspace = writeRoomWorkspaceV2(value);
    if (workspace) {
      set({ workspace });
    }
    return workspace;
  },
  resetWorkspace: () => {
    removeRoomWorkspaceV2();
    set({ workspace: null });
  },
}));

function syncRoomWorkspaceFromPersistedEvent(event: Event) {
  const detail = (event as CustomEvent<PersistedRoomWorkspaceEventDetail>).detail;
  if (detail?.key !== STORAGE_KEYS.roomWorkspace) {
    return;
  }

  useRoomWorkspaceStore.setState({
    workspace: parseRoomWorkspaceV2(detail.value),
  });
}

function syncRoomWorkspaceFromStorageEvent(event: StorageEvent) {
  if (event.key !== STORAGE_KEYS.roomWorkspace) {
    return;
  }

  let value: unknown = null;
  try {
    value = event.newValue ? JSON.parse(event.newValue) : null;
  } catch {
    value = null;
  }

  useRoomWorkspaceStore.setState({
    workspace: parseRoomWorkspaceV2(value),
  });
}

if (typeof window !== 'undefined') {
  window.addEventListener(PERSISTED_STATE_EVENT, syncRoomWorkspaceFromPersistedEvent);
  window.addEventListener('storage', syncRoomWorkspaceFromStorageEvent);
}
