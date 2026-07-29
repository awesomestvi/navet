export const PWA_REGISTRATION_IDLE_TIMEOUT_MS = 15_000;
export const PWA_REGISTRATION_FALLBACK_DELAY_MS = 2_000;

type IdleDeadline = {
  didTimeout: boolean;
  timeRemaining: () => number;
};

type PwaRegistrationSchedulerTarget = {
  addEventListener: (type: 'load', listener: () => void, options?: AddEventListenerOptions) => void;
  document: Pick<Document, 'readyState'>;
  removeEventListener: (type: 'load', listener: () => void) => void;
  requestIdleCallback?: (
    callback: (deadline: IdleDeadline) => void,
    options?: { timeout: number }
  ) => number;
  cancelIdleCallback?: (handle: number) => void;
  setTimeout: (callback: () => void, delay: number) => number;
  clearTimeout: (handle: number) => void;
};

function getDefaultSchedulerTarget(): PwaRegistrationSchedulerTarget {
  return {
    addEventListener: window.addEventListener.bind(window),
    cancelIdleCallback: window.cancelIdleCallback?.bind(window),
    clearTimeout: window.clearTimeout.bind(window),
    document,
    removeEventListener: window.removeEventListener.bind(window),
    requestIdleCallback: window.requestIdleCallback?.bind(window),
    setTimeout: window.setTimeout.bind(window),
  };
}

export function isHomeAssistantIngressPwaContext(
  pathname = window.location.pathname,
  baseHref = document.querySelector('base')?.getAttribute('href')?.trim() ?? ''
) {
  return pathname.includes('/api/hassio_ingress/') || (baseHref !== '' && baseHref !== '/');
}

export function schedulePwaRegistration(
  register: () => void,
  target: PwaRegistrationSchedulerTarget = getDefaultSchedulerTarget()
) {
  let idleHandle: number | null = null;
  let timeoutHandle: number | null = null;
  let cancelled = false;

  const run = () => {
    idleHandle = null;
    timeoutHandle = null;
    if (!cancelled) {
      register();
    }
  };

  const scheduleWhenIdle = () => {
    if (cancelled) {
      return;
    }

    if (target.requestIdleCallback) {
      idleHandle = target.requestIdleCallback(run, {
        timeout: PWA_REGISTRATION_IDLE_TIMEOUT_MS,
      });
      return;
    }

    timeoutHandle = target.setTimeout(run, PWA_REGISTRATION_FALLBACK_DELAY_MS);
  };

  if (target.document.readyState === 'complete') {
    scheduleWhenIdle();
  } else {
    target.addEventListener('load', scheduleWhenIdle, { once: true });
  }

  return () => {
    cancelled = true;
    target.removeEventListener('load', scheduleWhenIdle);
    if (idleHandle !== null) {
      target.cancelIdleCallback?.(idleHandle);
      idleHandle = null;
    }
    if (timeoutHandle !== null) {
      target.clearTimeout(timeoutHandle);
      timeoutHandle = null;
    }
  };
}
