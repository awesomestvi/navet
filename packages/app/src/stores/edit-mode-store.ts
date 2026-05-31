import { STORE_STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import {
  readLocalStorageWithMigration,
  removeLocalStorageWithMigration,
  writeLocalStorageWithMigration,
} from '@navet/app/utils/local-storage-migration';
import { create } from 'zustand';
import { createJSONStorage, persist } from 'zustand/middleware';

interface EditModeState {
  isEditMode: boolean;
  setEditMode: (isEditMode: boolean) => void;
  toggleEditMode: () => void;
}

export const useEditModeStore = create<EditModeState>()(
  persist(
    (set) => ({
      isEditMode: false,
      setEditMode: (isEditMode) => set({ isEditMode }),
      toggleEditMode: () => set((state) => ({ isEditMode: !state.isEditMode })),
    }),
    {
      name: STORE_STORAGE_KEYS.editMode,
      storage: createJSONStorage(() => ({
        getItem: (name) => readLocalStorageWithMigration(name, localStorage),
        setItem: (name, value) => writeLocalStorageWithMigration(name, value, localStorage),
        removeItem: (name) => removeLocalStorageWithMigration(name, localStorage),
      })),
      merge: (persisted, current) => {
        const next = (persisted as Partial<EditModeState> | null) ?? {};
        return {
          ...current,
          isEditMode: typeof next.isEditMode === 'boolean' ? next.isEditMode : current.isEditMode,
        };
      },
    }
  )
);
