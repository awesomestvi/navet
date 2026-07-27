import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { PERSISTED_STATE_EVENT } from '@navet/app/utils/persisted-state-events';
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

export const useRoomWorkspaceStore = create<RoomWorkspaceStore>((set) => ({
  workspace: readRoomWorkspaceV2(),
  initialize: (discoveredRooms, options) => {
    const workspace = loadOrMigrateRoomWorkspaceV2(discoveredRooms, options);
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
