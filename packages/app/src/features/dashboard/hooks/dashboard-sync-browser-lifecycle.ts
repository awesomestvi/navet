/** Browser resources owned by one dashboard synchronization session.
 * Document reconciliation and write policy remain with each caller.
 */
export function createDashboardSyncBrowserLifecycle() {
  let disposed = false;
  let online = typeof navigator === 'undefined' || navigator.onLine;
  let visible = typeof document === 'undefined' || document.visibilityState === 'visible';
  const timers = new Set<number>();
  const cleanups: Array<() => void> = [];

  return {
    get disposed() {
      return disposed;
    },
    get online() {
      return online;
    },
    get visible() {
      return visible;
    },
    schedule(callback: () => void, delay: number) {
      if (disposed) return 0;
      const timer = window.setTimeout(() => {
        timers.delete(timer);
        if (!disposed) callback();
      }, delay);
      timers.add(timer);
      return timer;
    },
    clear(timer: number) {
      window.clearTimeout(timer);
      timers.delete(timer);
    },
    listen(handlers: {
      online: () => void;
      offline: () => void;
      visibility: () => void;
      pagehide: () => void;
    }) {
      if (disposed) return;
      const handleOnline = () => {
        online = true;
        handlers.online();
      };
      const handleOffline = () => {
        online = false;
        handlers.offline();
      };
      const handleVisibility = () => {
        visible = document.visibilityState === 'visible';
        handlers.visibility();
      };
      const handlePageHide = () => handlers.pagehide();
      window.addEventListener('online', handleOnline);
      window.addEventListener('offline', handleOffline);
      window.addEventListener('pagehide', handlePageHide);
      document.addEventListener('visibilitychange', handleVisibility);
      cleanups.push(() => {
        window.removeEventListener('online', handleOnline);
        window.removeEventListener('offline', handleOffline);
        window.removeEventListener('pagehide', handlePageHide);
        document.removeEventListener('visibilitychange', handleVisibility);
      });
    },
    dispose() {
      disposed = true;
      for (const timer of timers) window.clearTimeout(timer);
      timers.clear();
      for (const cleanup of cleanups) cleanup();
      cleanups.length = 0;
    },
  };
}
