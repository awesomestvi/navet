import { useCallback } from 'react';
import { useEditModeStore } from '../stores/edit-mode-store';

/**
 * Custom hook for managing edit mode state
 * Provides toggle functionality for card editing mode
 */
export const useEditMode = () => {
  const isEditMode = useEditModeStore((state) => state.isEditMode);
  const storeSetEditMode = useEditModeStore((state) => state.setEditMode);
  const storeToggleEditMode = useEditModeStore((state) => state.toggleEditMode);

  const toggleEditMode = useCallback(() => {
    storeToggleEditMode();
  }, [storeToggleEditMode]);

  const setEditMode = useCallback(
    (mode: boolean) => {
      storeSetEditMode(mode);
    },
    [storeSetEditMode]
  );

  return { isEditMode, toggleEditMode, setEditMode };
};
