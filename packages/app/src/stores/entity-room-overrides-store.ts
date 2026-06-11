import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  readLocalStorageWithMigration,
  removeLocalStorageWithMigration,
  writeLocalStorageWithMigration,
} from '@navet/app/utils/local-storage-migration';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface EntityRoomOverridesState {
  roomIdsByEntityId: Record<string, string>;
  setRoomOverride: (entityId: string, roomId: string) => void;
  clearRoomOverride: (entityId: string) => void;
  replaceRoomOverrides: (roomIdsByEntityId: Record<string, string>) => void;
}

function sanitizeRoomOverrideRecord(value: unknown): Record<string, string> {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return {};
  }

  return Object.fromEntries(
    Object.entries(value).filter(
      ([entityId, roomId]) =>
        typeof entityId === 'string' &&
        entityId.length > 0 &&
        typeof roomId === 'string' &&
        roomId.length > 0
    )
  );
}

export const useEntityRoomOverridesStore = create<EntityRoomOverridesState>()(
  persist(
    (set) => ({
      roomIdsByEntityId: {},
      setRoomOverride: (entityId, roomId) =>
        set((state) => ({
          roomIdsByEntityId:
            state.roomIdsByEntityId[entityId] === roomId
              ? state.roomIdsByEntityId
              : { ...state.roomIdsByEntityId, [entityId]: roomId },
        })),
      clearRoomOverride: (entityId) =>
        set((state) => {
          if (!(entityId in state.roomIdsByEntityId)) {
            return state;
          }

          const nextRoomIdsByEntityId = { ...state.roomIdsByEntityId };
          delete nextRoomIdsByEntityId[entityId];
          return { roomIdsByEntityId: nextRoomIdsByEntityId };
        }),
      replaceRoomOverrides: (roomIdsByEntityId) =>
        set({ roomIdsByEntityId: sanitizeRoomOverrideRecord(roomIdsByEntityId) }),
    }),
    {
      name: STORE_STORAGE_KEYS.entityRoomOverrides,
      storage: createJSONStorage(() => ({
        getItem: (name) => readLocalStorageWithMigration(name, localStorage),
        setItem: (name, value) => writeLocalStorageWithMigration(name, value, localStorage),
        removeItem: (name) => removeLocalStorageWithMigration(name, localStorage),
      })),
      partialize: (state) => ({ roomIdsByEntityId: state.roomIdsByEntityId }),
      merge: (persistedState, currentState) => {
        const state = persistedState as Partial<EntityRoomOverridesState> | undefined;
        return {
          ...currentState,
          ...state,
          roomIdsByEntityId: sanitizeRoomOverrideRecord(state?.roomIdsByEntityId),
        };
      },
    }
  )
);
