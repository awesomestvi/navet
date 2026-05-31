import { useEffect } from 'react';

export function useEditModeBeforeUnload(isEditMode: boolean) {
  useEffect(() => {
    if (!isEditMode) {
      return;
    }

    const handleBeforeUnload = (event: BeforeUnloadEvent) => {
      event.preventDefault();
      event.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);

    return () => {
      window.removeEventListener('beforeunload', handleBeforeUnload);
    };
  }, [isEditMode]);
}
