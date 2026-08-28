import { isHomeAssistantPanelMode } from '@navet/app/runtime/app-mode';
import { getChoreWorkspaceTransport } from '@navet/app/services/chore-workspace.service';
import { useEffect } from 'react';
import { useChoreWorkspaceStore } from './chore-workspace-store';

const VISIBLE_REFRESH_INTERVAL_MS = 30_000;

export function useChoreWorkspaceSync(enabled = true) {
  const load = useChoreWorkspaceStore((state) => state.load);

  useEffect(() => {
    if (!enabled) return;
    void load();
    let active = true;
    let unsubscribe = () => {};
    if (isHomeAssistantPanelMode()) {
      void getChoreWorkspaceTransport()
        .subscribe((document) => {
          if (!active) return;
          useChoreWorkspaceStore.setState({
            data: document.data,
            revision: document.revision,
            error: null,
            recovery: null,
            managementPinConfigured: document.management.pinConfigured,
            status: 'ready',
          });
        })
        .then((dispose) => {
          if (active) unsubscribe = dispose;
          else dispose();
        })
        .catch(() => undefined);
    }
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const interval = window.setInterval(refresh, VISIBLE_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      active = false;
      unsubscribe();
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, load]);
}
