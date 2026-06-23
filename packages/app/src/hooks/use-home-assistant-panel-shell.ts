import { resolveParentHomeAssistantShellBridge } from '@navet/app/infrastructure/home-assistant/runtime/parent-hass-bridge';
import { useCallback, useEffect, useState } from 'react';

interface HomeAssistantPanelShellState {
  available: boolean;
  canToggleKiosk: boolean;
  canOpenSidebar: boolean;
  canNavigateHome: boolean;
  isKioskEnabled: boolean | null;
}

const unavailableState: HomeAssistantPanelShellState = {
  available: false,
  canToggleKiosk: false,
  canOpenSidebar: false,
  canNavigateHome: false,
  isKioskEnabled: null,
};

function readShellState(): HomeAssistantPanelShellState {
  const shell = resolveParentHomeAssistantShellBridge();
  const hasHostShellControls = Boolean(shell?.canOpenSidebar || shell?.canToggleKiosk);

  if (!shell || !hasHostShellControls) {
    return unavailableState;
  }

  return {
    available: true,
    canToggleKiosk: shell.canToggleKiosk,
    canOpenSidebar: shell.canOpenSidebar,
    canNavigateHome: shell.canNavigateHome,
    isKioskEnabled: shell.isKioskEnabled(),
  };
}

export function useHomeAssistantPanelShell() {
  const [state, setState] = useState<HomeAssistantPanelShellState>(() => readShellState());

  const refresh = useCallback(() => {
    setState(readShellState());
  }, []);

  useEffect(() => {
    const shell = resolveParentHomeAssistantShellBridge();
    shell?.connect(() => refresh());
    refresh();

    return () => {
      shell?.disconnect();
    };
  }, [refresh]);

  const openHomeAssistantSidebar = useCallback(async () => {
    const shell = resolveParentHomeAssistantShellBridge();
    if (!shell) {
      return false;
    }

    const opened = await shell.openHomeAssistantSidebar();
    refresh();
    return opened;
  }, [refresh]);

  const setHomeAssistantKioskEnabled = useCallback(
    async (enabled: boolean) => {
      const shell = resolveParentHomeAssistantShellBridge();
      if (!shell) {
        return false;
      }

      const changed = await shell.setHomeAssistantKioskEnabled(enabled);
      refresh();
      return changed;
    },
    [refresh]
  );

  const toggleHomeAssistantKiosk = useCallback(async () => {
    const shell = resolveParentHomeAssistantShellBridge();
    if (!shell) {
      return false;
    }

    const current = shell.isKioskEnabled();
    const changed = await shell.setHomeAssistantKioskEnabled(!(current ?? false));
    refresh();
    return changed;
  }, [refresh]);

  const navigateToHomeAssistantHome = useCallback(async () => {
    const shell = resolveParentHomeAssistantShellBridge();
    if (!shell) {
      return false;
    }

    return shell.navigateToHomeAssistantHome();
  }, []);

  return {
    ...state,
    navigateToHomeAssistantHome,
    openHomeAssistantSidebar,
    setHomeAssistantKioskEnabled,
    toggleHomeAssistantKiosk,
  };
}

export function useSyncHomeAssistantPanelKioskMode() {
  useEffect(() => {
    const shell = resolveParentHomeAssistantShellBridge();
    if (!shell) {
      return;
    }

    void shell?.setHomeAssistantKioskEnabled(true);

    return () => {
      void shell?.setHomeAssistantKioskEnabled(false);
    };
  }, []);
}
