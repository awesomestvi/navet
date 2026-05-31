import { useCallback, useState } from 'react';

/**
 * Reusable hook for managing card settings dialog state.
 * Eliminates duplicated dialog open/close logic across card components.
 *
 * @param initialState - Initial open state (default: false)
 * @returns Dialog state and handlers
 *
 * @example
 * ```ts
 * const { isOpen, onOpen, onClose, onToggle } = useCardSettingsDialog();
 *
 * // Usage in component:
 * const [isSettingsOpen, setIsSettingsOpen] = useState(false);
 * const { isOpen, onOpen, onClose } = useCardSettingsDialog(isSettingsOpen);
 * // Or with internal state:
 * const { isOpen, onOpen, onClose, onToggle } = useCardSettingsDialog();
 * ```
 */
export function useCardSettingsDialog(initialState = false) {
  const [isOpen, setIsOpen] = useState(initialState);

  const onOpen = useCallback(() => setIsOpen(true), []);
  const onClose = useCallback(() => setIsOpen(false), []);
  const onToggle = useCallback(() => setIsOpen((prev) => !prev), []);

  return {
    isOpen,
    onOpen,
    onClose,
    onToggle,
    setIsOpen,
  };
}

/**
 * Type for card settings dialog hook return value
 */
export interface UseCardSettingsDialogReturn {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
  onToggle: () => void;
  setIsOpen: (open: boolean) => void;
}
