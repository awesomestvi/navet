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
      name: 'ha-dashboard-edit-mode',
      storage: createJSONStorage(() => localStorage),
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
