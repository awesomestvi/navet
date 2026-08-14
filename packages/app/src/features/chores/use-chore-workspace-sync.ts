import { useEffect } from 'react';
import { useChoreWorkspaceStore } from './chore-workspace-store';

const VISIBLE_REFRESH_INTERVAL_MS = 30_000;

export function useChoreWorkspaceSync(enabled = true) {
  const load = useChoreWorkspaceStore((state) => state.load);

  useEffect(() => {
    if (!enabled) return;
    void load();
    const refresh = () => {
      if (document.visibilityState === 'visible') void load();
    };
    const interval = window.setInterval(refresh, VISIBLE_REFRESH_INTERVAL_MS);
    document.addEventListener('visibilitychange', refresh);
    return () => {
      window.clearInterval(interval);
      document.removeEventListener('visibilitychange', refresh);
    };
  }, [enabled, load]);
}
