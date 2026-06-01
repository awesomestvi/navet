import { useEffect } from 'react';

const EDIT_MODE_SETTINGS_REQUEST_EVENT = 'navet:edit-mode-open-settings';

interface EditModeSettingsRequestDetail {
  id: string;
}

export function dispatchEditModeSettingsRequest(id: string) {
  if (typeof window === 'undefined') {
    return;
  }

  window.dispatchEvent(
    new CustomEvent<EditModeSettingsRequestDetail>(EDIT_MODE_SETTINGS_REQUEST_EVENT, {
      detail: { id },
    })
  );
}

export function useEditModeSettingsRequest(id: string, onOpenSettings: () => void, enabled = true) {
  useEffect(() => {
    if (!enabled || typeof window === 'undefined') {
      return;
    }

    const handleRequest = (event: Event) => {
      const detail = (event as CustomEvent<EditModeSettingsRequestDetail>).detail;
      if (!detail || detail.id !== id) {
        return;
      }

      onOpenSettings();
    };

    window.addEventListener(EDIT_MODE_SETTINGS_REQUEST_EVENT, handleRequest as EventListener);
    return () => {
      window.removeEventListener(EDIT_MODE_SETTINGS_REQUEST_EVENT, handleRequest as EventListener);
    };
  }, [enabled, id, onOpenSettings]);
}
