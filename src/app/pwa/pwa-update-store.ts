import { registerSW } from 'virtual:pwa-register';
import { useSyncExternalStore } from 'react';

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
const listeners = new Set<() => void>();

function getBaseHref() {
  if (typeof document === 'undefined') {
    return '/';
  }

  const href = document.querySelector('base')?.getAttribute('href')?.trim();
  if (!href || href === '/') {
    return '/';
  }

  return href.endsWith('/') ? href : `${href}/`;
}

function isHomeAssistantIngress() {
  if (typeof window === 'undefined') {
    return false;
  }

  return window.location.pathname.includes('/api/hassio_ingress/') || getBaseHref() !== '/';
}

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

export function registerPwaServiceWorker() {
  if (isHomeAssistantIngress()) {
    void unregisterIngressServiceWorkers();
    updateServiceWorker = null;
    return;
  }

  updateServiceWorker = registerSW({
    immediate: true,
    onOfflineReady() {
      setState({ offlineReady: true });
    },
    onNeedRefresh() {
      setState({ updateAvailable: true });
    },
  });
}

export async function applyPwaUpdate() {
  if (!updateServiceWorker) {
    return;
  }

  await updateServiceWorker(true);
}

export function dismissPwaUpdate() {
  setState({ updateAvailable: false });
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
