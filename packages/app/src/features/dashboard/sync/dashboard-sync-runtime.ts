export interface DashboardSyncBrowserHandlers {
  online: () => void;
  offline: () => void;
  visibility: () => void;
  pagehide: () => void;
}

type AsyncCommand = () => Promise<void>;

interface CommandLane {
  active: Promise<void> | null;
  pending: AsyncCommand | null;
}

/**
 * Non-React runtime shared by dashboard synchronization policies. It owns
 * browser lifecycle state, timers, and latest-command sequencing; profile and
 * preference modules retain only document reconciliation policy.
 */
export function createDashboardSyncRuntime() {
  let disposed = false;
  let online = typeof navigator === 'undefined' || navigator.onLine;
  let visible = typeof document === 'undefined' || document.visibilityState === 'visible';
  const timers = new Set<number>();
  const namedTimers = new Map<string, number>();
  const commandLanes = new Map<string, CommandLane>();
  const cleanups: Array<() => void> = [];

  const clearTimer = (timer: number) => {
    window.clearTimeout(timer);
    timers.delete(timer);
    for (const [key, current] of namedTimers) {
      if (current === timer) namedTimers.delete(key);
    }
  };

  const runtime = {
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
    scheduleNamed(key: string, callback: () => void, delay: number) {
      const previous = namedTimers.get(key);
      if (previous !== undefined) clearTimer(previous);
      const timer = runtime.schedule(() => {
        namedTimers.delete(key);
        callback();
      }, delay);
      if (timer !== 0) namedTimers.set(key, timer);
      return timer;
    },
    clear(timerOrKey: number | string) {
      if (typeof timerOrKey === 'string') {
        const timer = namedTimers.get(timerOrKey);
        if (timer !== undefined) clearTimer(timer);
        return;
      }
      clearTimer(timerOrKey);
    },
    hasScheduled(key: string) {
      return namedTimers.has(key);
    },
    isRunning(key: string) {
      return Boolean(commandLanes.get(key)?.active);
    },
    runLatest(key: string, command: AsyncCommand) {
      if (disposed) return Promise.resolve();
      const lane = commandLanes.get(key) ?? { active: null, pending: null };
      commandLanes.set(key, lane);
      if (lane.active) {
        lane.pending = command;
        return lane.active;
      }

      const drain = async () => {
        let next: AsyncCommand | null = command;
        while (next && !disposed) {
          lane.pending = null;
          await next();
          next = lane.pending;
        }
      };
      lane.active = drain().finally(() => {
        lane.active = null;
        lane.pending = null;
      });
      return lane.active;
    },
    listen(handlers: DashboardSyncBrowserHandlers) {
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
      namedTimers.clear();
      for (const lane of commandLanes.values()) lane.pending = null;
      for (const cleanup of cleanups) cleanup();
      cleanups.length = 0;
    },
  };

  return runtime;
}

export type DashboardSyncRuntime = ReturnType<typeof createDashboardSyncRuntime>;
