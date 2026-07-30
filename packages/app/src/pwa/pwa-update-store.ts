import { registerSW } from 'virtual:pwa-register';
import { useSyncExternalStore } from 'react';
import { isHomeAssistantIngressPwaContext } from './pwa-registration-scheduler';

export const PWA_UPDATE_CHECK_INTERVAL_MS = 30 * 60 * 1000;
export const PWA_UPDATE_CHECK_THROTTLE_MS = 60 * 1000;
export const PWA_UPDATE_SNOOZE_MS = 60 * 60 * 1000;

type PwaUpdateState = {
  offlineReady: boolean;
  updateAvailable: boolean;
};

const initialState: PwaUpdateState = {
  offlineReady: false,
  updateAvailable: false,
};

let state: PwaUpdateState = initialState;
let updateServiceWorker: ((reloadPage?: boolean) => Promise<void>) | null = null;
let serviceWorkerRegistration: ServiceWorkerRegistration | null = null;
let updateCheckIntervalId: number | null = null;
let snoozeTimeoutId: number | null = null;
let updateCheckInFlight: Promise<void> | null = null;
let lastUpdateCheckAt = Number.NEGATIVE_INFINITY;
let snoozedUntil = Number.NEGATIVE_INFINITY;
let waitingUpdateObserved = false;
let registrationStarted = false;
let updateMonitoringStarted = false;
const listeners = new Set<() => void>();

async function unregisterIngressServiceWorkers() {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  const registrations = await navigator.serviceWorker.getRegistrations();
  await Promise.all(
    registrations.map(async (registration) => {
      const scope = registration.scope ?? '';
      if (scope.includes('/api/hassio_ingress/')) {
        await registration.unregister();
      }
    })
  );
}

function emit() {
  for (const listener of listeners) {
    listener();
  }
}

function setState(nextState: Partial<PwaUpdateState>) {
  const next = { ...state, ...nextState };
  if (next.offlineReady === state.offlineReady && next.updateAvailable === state.updateAvailable) {
    return;
  }
  state = next;
  emit();
}

function clearSnoozeTimeout() {
  if (snoozeTimeoutId === null) {
    return;
  }

  window.clearTimeout(snoozeTimeoutId);
  snoozeTimeoutId = null;
}

function confirmWaitingUpdateAfterSnooze() {
  requestPwaUpdateCheck({ bypassThrottle: true });
}

function surfaceWaitingUpdate() {
  waitingUpdateObserved = true;
  const remainingSnoozeMs = snoozedUntil - Date.now();
  if (remainingSnoozeMs <= 0) {
    snoozedUntil = Number.NEGATIVE_INFINITY;
    clearSnoozeTimeout();
    setState({ updateAvailable: true });
    return;
  }

  clearSnoozeTimeout();
  snoozeTimeoutId = window.setTimeout(() => {
    snoozeTimeoutId = null;
    snoozedUntil = Number.NEGATIVE_INFINITY;
    if (waitingUpdateObserved) {
      void confirmWaitingUpdateAfterSnooze();
    }
  }, remainingSnoozeMs);
}

async function resolveServiceWorkerRegistration() {
  if (serviceWorkerRegistration) {
    return serviceWorkerRegistration;
  }

  const registration = await navigator.serviceWorker.getRegistration();
  serviceWorkerRegistration = registration ?? null;
  return serviceWorkerRegistration;
}

async function checkForPwaUpdate() {
  try {
    const registration = await resolveServiceWorkerRegistration();
    if (!registration) {
      if (snoozedUntil <= Date.now()) {
        waitingUpdateObserved = false;
        setState({ updateAvailable: false });
      }
      return;
    }

    if (registration.waiting) {
      surfaceWaitingUpdate();
      return;
    }

    await registration.update();
    if (registration.waiting) {
      surfaceWaitingUpdate();
    } else if (snoozedUntil <= Date.now()) {
      waitingUpdateObserved = false;
      setState({ updateAvailable: false });
    }
  } catch {
    // Offline and transient service-worker failures should not disturb the dashboard.
  }
}

function requestPwaUpdateCheck({ bypassThrottle = false }: { bypassThrottle?: boolean } = {}) {
  if (!registrationStarted) {
    registerPwaServiceWorker();
    return;
  }

  const now = Date.now();
  if (
    updateCheckInFlight ||
    (!bypassThrottle && now - lastUpdateCheckAt < PWA_UPDATE_CHECK_THROTTLE_MS)
  ) {
    return;
  }

  lastUpdateCheckAt = now;
  const check = checkForPwaUpdate().finally(() => {
    if (updateCheckInFlight === check) {
      updateCheckInFlight = null;
    }
  });
  updateCheckInFlight = check;
}

function handlePwaVisibilityChange() {
  if (document.visibilityState === 'visible') {
    requestPwaUpdateCheck();
  }
}

function handlePwaOnline() {
  requestPwaUpdateCheck();
}

function handlePwaRegistrationError() {
  registrationStarted = false;
  updateServiceWorker = null;
  serviceWorkerRegistration = null;
  lastUpdateCheckAt = Number.NEGATIVE_INFINITY;
}

function startPwaUpdateMonitoring() {
  if (updateMonitoringStarted) {
    return;
  }

  updateMonitoringStarted = true;
  document.addEventListener('visibilitychange', handlePwaVisibilityChange);
  window.addEventListener('online', handlePwaOnline);
  updateCheckIntervalId = window.setInterval(requestPwaUpdateCheck, PWA_UPDATE_CHECK_INTERVAL_MS);
}

function stopPwaUpdateMonitoring() {
  if (!updateMonitoringStarted) {
    return;
  }

  updateMonitoringStarted = false;
  document.removeEventListener('visibilitychange', handlePwaVisibilityChange);
  window.removeEventListener('online', handlePwaOnline);
  if (updateCheckIntervalId !== null) {
    window.clearInterval(updateCheckIntervalId);
    updateCheckIntervalId = null;
  }
}

export function registerPwaServiceWorker() {
  if (registrationStarted || typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    return;
  }

  registrationStarted = true;
  if (isHomeAssistantIngressPwaContext()) {
    stopPwaUpdateMonitoring();
    void unregisterIngressServiceWorkers();
    updateServiceWorker = null;
    serviceWorkerRegistration = null;
    return;
  }

  startPwaUpdateMonitoring();
  try {
    updateServiceWorker = registerSW({
      immediate: true,
      onOfflineReady() {
        setState({ offlineReady: true });
      },
      onNeedRefresh() {
        surfaceWaitingUpdate();
      },
      onRegisteredSW(_serviceWorkerUrl, registration) {
        serviceWorkerRegistration = registration ?? null;
        lastUpdateCheckAt = Date.now();
        if (registration?.waiting) {
          surfaceWaitingUpdate();
        }
      },
      onRegisterError() {
        handlePwaRegistrationError();
      },
    });
  } catch {
    handlePwaRegistrationError();
  }
}

export async function applyPwaUpdate() {
  if (!updateServiceWorker) {
    return;
  }

  await updateServiceWorker(true);
}

export async function refreshPwaApp() {
  if ((state.updateAvailable || waitingUpdateObserved) && updateServiceWorker) {
    await applyPwaUpdate();
    return;
  }

  if (typeof window !== 'undefined') {
    window.location.reload();
  }
}

export function snoozePwaUpdate() {
  if (!state.updateAvailable && !waitingUpdateObserved) {
    return;
  }

  waitingUpdateObserved = true;
  snoozedUntil = Date.now() + PWA_UPDATE_SNOOZE_MS;
  setState({ updateAvailable: false });
  surfaceWaitingUpdate();
}

export function dismissPwaUpdate() {
  snoozePwaUpdate();
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

function getSnapshot() {
  return state;
}

export function usePwaUpdateState() {
  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}

export function resetPwaUpdateStoreForTests() {
  stopPwaUpdateMonitoring();
  clearSnoozeTimeout();
  state = initialState;
  updateServiceWorker = null;
  serviceWorkerRegistration = null;
  updateCheckInFlight = null;
  lastUpdateCheckAt = Number.NEGATIVE_INFINITY;
  snoozedUntil = Number.NEGATIVE_INFINITY;
  waitingUpdateObserved = false;
  registrationStarted = false;
  listeners.clear();
}
