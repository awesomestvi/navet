const PRELOAD_RELOAD_STORAGE_KEY = 'navet:preload-reload-at';
const PRELOAD_RELOAD_GUARD_MS = 60_000;
const SERVICE_WORKER_UPDATE_TIMEOUT_MS = 5_000;
const SERVICE_WORKER_ACTIVATION_TIMEOUT_MS = 2_000;

let inMemoryLastReloadAt = Number.NEGATIVE_INFINITY;

type PreloadErrorRecoveryOptions = {
  activateUpdate?: () => Promise<void>;
  now?: () => number;
  reload?: () => void;
  storage?: Pick<Storage, 'getItem' | 'setItem'> | null;
};

function waitForServiceWorkerEvent(
  target: Pick<EventTarget, 'addEventListener' | 'removeEventListener'>,
  eventName: string,
  timeoutMs: number
) {
  return new Promise<void>((resolve) => {
    const finish = () => {
      window.clearTimeout(timeoutHandle);
      target.removeEventListener(eventName, finish);
      resolve();
    };
    const timeoutHandle = window.setTimeout(finish, timeoutMs);
    target.addEventListener(eventName, finish, { once: true });
  });
}

async function resolveWaitingServiceWorker(registration: ServiceWorkerRegistration) {
  if (registration.waiting) {
    return registration.waiting;
  }

  if (!registration.installing) {
    await registration.update();
  }
  if (registration.waiting) {
    return registration.waiting;
  }

  const installing = registration.installing;
  if (!installing) {
    return null;
  }
  if (installing.state !== 'installed') {
    await waitForServiceWorkerEvent(installing, 'statechange', SERVICE_WORKER_UPDATE_TIMEOUT_MS);
  }

  return registration.waiting ?? (installing.state === 'installed' ? installing : null);
}

export async function activateWaitingPwaUpdate() {
  if (typeof navigator === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  if (!registration) {
    return;
  }

  const waiting = await resolveWaitingServiceWorker(registration);
  if (!waiting) {
    return;
  }

  const controllerChanged = waitForServiceWorkerEvent(
    navigator.serviceWorker,
    'controllerchange',
    SERVICE_WORKER_ACTIVATION_TIMEOUT_MS
  );
  waiting.postMessage({ type: 'SKIP_WAITING' });
  await controllerChanged;
}

function getSessionStorage() {
  try {
    return window.sessionStorage;
  } catch {
    return null;
  }
}

function readLastReloadAt(storage: PreloadErrorRecoveryOptions['storage']) {
  try {
    const value = storage?.getItem(PRELOAD_RELOAD_STORAGE_KEY);
    const parsed = value ? Number(value) : Number.NaN;
    return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY;
  } catch {
    return Number.NEGATIVE_INFINITY;
  }
}

function writeLastReloadAt(storage: PreloadErrorRecoveryOptions['storage'], timestamp: number) {
  try {
    storage?.setItem(PRELOAD_RELOAD_STORAGE_KEY, String(timestamp));
  } catch {
    // The in-memory guard still prevents duplicate reload attempts before navigation completes.
  }
}

export function createVitePreloadErrorHandler(options: PreloadErrorRecoveryOptions = {}) {
  const activateUpdate = options.activateUpdate ?? activateWaitingPwaUpdate;
  const now = options.now ?? Date.now;
  const reload = options.reload ?? (() => window.location.reload());
  const storage = options.storage === undefined ? getSessionStorage() : options.storage;

  return (event: Event) => {
    const timestamp = now();
    const lastReloadAt = Math.max(inMemoryLastReloadAt, readLastReloadAt(storage));
    if (timestamp - lastReloadAt < PRELOAD_RELOAD_GUARD_MS) {
      return;
    }

    event.preventDefault();
    inMemoryLastReloadAt = timestamp;
    writeLastReloadAt(storage, timestamp);
    void activateUpdate()
      .catch(() => {
        // Reload recovery still helps when the update check itself is unavailable.
      })
      .finally(reload);
  };
}

export function installVitePreloadErrorRecovery() {
  const handler = createVitePreloadErrorHandler();
  window.addEventListener('vite:preloadError', handler);
  return () => window.removeEventListener('vite:preloadError', handler);
}

export function resetVitePreloadErrorRecoveryForTests() {
  inMemoryLastReloadAt = Number.NEGATIVE_INFINITY;
}
