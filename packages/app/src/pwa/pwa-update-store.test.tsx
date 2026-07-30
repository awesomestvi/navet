import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

type RegisterOptions = {
  onNeedRefresh?: () => void;
  onRegisterError?: (error: unknown) => void;
  onRegisteredSW?: (
    serviceWorkerUrl: string,
    registration: ServiceWorkerRegistration | undefined
  ) => void;
};

const pwaRegisterHarness = vi.hoisted(() => ({
  options: null as RegisterOptions | null,
  register: vi.fn(),
  updateServiceWorker: vi.fn(async (_reloadPage?: boolean) => {}),
}));

vi.mock('virtual:pwa-register', () => ({
  registerSW: (options: RegisterOptions) => {
    pwaRegisterHarness.options = options;
    pwaRegisterHarness.register(options);
    return pwaRegisterHarness.updateServiceWorker;
  },
}));

import {
  PWA_UPDATE_CHECK_INTERVAL_MS,
  PWA_UPDATE_CHECK_THROTTLE_MS,
  PWA_UPDATE_SNOOZE_MS,
  registerPwaServiceWorker,
  resetPwaUpdateStoreForTests,
  snoozePwaUpdate,
  usePwaUpdateState,
} from './pwa-update-store';

type RegistrationHarness = {
  update: ReturnType<typeof vi.fn>;
  waiting: ServiceWorker | null;
};

function createRegistration(): RegistrationHarness {
  return {
    update: vi.fn(async () => {}),
    waiting: null,
  };
}

function installServiceWorkerContainer({
  registration,
  registrations = registration ? [registration] : [],
}: {
  registration?: RegistrationHarness | null;
  registrations?: Array<
    RegistrationHarness & {
      scope?: string;
      unregister?: ReturnType<typeof vi.fn>;
    }
  >;
}) {
  const container = {
    getRegistration: vi.fn(async () => registration ?? undefined),
    getRegistrations: vi.fn(async () => registrations),
  };
  Object.defineProperty(window.navigator, 'serviceWorker', {
    configurable: true,
    value: container,
  });
  return container;
}

async function flushAsyncWork() {
  for (let index = 0; index < 5; index += 1) {
    await Promise.resolve();
  }
}

describe('PWA update store', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    resetPwaUpdateStoreForTests();
    pwaRegisterHarness.options = null;
    pwaRegisterHarness.register.mockClear();
    pwaRegisterHarness.updateServiceWorker.mockClear();
    window.history.replaceState({}, '', '/');
    Object.defineProperty(document, 'visibilityState', {
      configurable: true,
      value: 'visible',
    });
  });

  afterEach(() => {
    resetPwaUpdateStoreForTests();
    vi.useRealTimers();
  });

  it('deduplicates monitoring and throttles online, visibility, and interval checks', async () => {
    const registration = createRegistration();
    installServiceWorkerContainer({ registration });

    registerPwaServiceWorker();
    registerPwaServiceWorker();
    pwaRegisterHarness.options?.onRegisteredSW?.(
      '/sw.js',
      registration as unknown as ServiceWorkerRegistration
    );

    expect(pwaRegisterHarness.register).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(PWA_UPDATE_CHECK_THROTTLE_MS);
    window.dispatchEvent(new Event('online'));
    document.dispatchEvent(new Event('visibilitychange'));
    await flushAsyncWork();

    expect(registration.update).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(PWA_UPDATE_CHECK_INTERVAL_MS - PWA_UPDATE_CHECK_THROTTLE_MS);
    await flushAsyncWork();

    expect(registration.update).toHaveBeenCalledTimes(2);
  });

  it('turns Later into a bounded snooze and re-surfaces the waiting update', async () => {
    const registration = createRegistration();
    registration.waiting = {} as ServiceWorker;
    installServiceWorkerContainer({ registration });
    const { result } = renderHook(() => usePwaUpdateState());

    registerPwaServiceWorker();
    act(() => {
      pwaRegisterHarness.options?.onRegisteredSW?.(
        '/sw.js',
        registration as unknown as ServiceWorkerRegistration
      );
      pwaRegisterHarness.options?.onNeedRefresh?.();
    });
    expect(result.current.updateAvailable).toBe(true);

    act(() => {
      snoozePwaUpdate();
      pwaRegisterHarness.options?.onNeedRefresh?.();
    });
    expect(result.current.updateAvailable).toBe(false);

    act(() => {
      vi.advanceTimersByTime(PWA_UPDATE_SNOOZE_MS - 1);
    });
    expect(result.current.updateAvailable).toBe(false);

    await act(async () => {
      vi.advanceTimersByTime(1);
      await flushAsyncWork();
    });
    expect(result.current.updateAvailable).toBe(true);
  });

  it('does not re-surface a snoozed update that another tab already activated', async () => {
    const registration = createRegistration();
    registration.waiting = {} as ServiceWorker;
    installServiceWorkerContainer({ registration });
    const { result } = renderHook(() => usePwaUpdateState());

    registerPwaServiceWorker();
    act(() => {
      pwaRegisterHarness.options?.onRegisteredSW?.(
        '/sw.js',
        registration as unknown as ServiceWorkerRegistration
      );
      pwaRegisterHarness.options?.onNeedRefresh?.();
      snoozePwaUpdate();
    });
    registration.waiting = null;

    await act(async () => {
      vi.advanceTimersByTime(PWA_UPDATE_SNOOZE_MS);
      await flushAsyncWork();
    });

    expect(registration.update).toHaveBeenCalledOnce();
    expect(result.current.updateAvailable).toBe(false);
  });

  it('retries registration after a transient registration failure', () => {
    installServiceWorkerContainer({ registration: null });

    registerPwaServiceWorker();
    expect(pwaRegisterHarness.register).toHaveBeenCalledOnce();

    act(() => {
      pwaRegisterHarness.options?.onRegisterError?.(new Error('temporarily offline'));
      window.dispatchEvent(new Event('online'));
    });

    expect(pwaRegisterHarness.register).toHaveBeenCalledTimes(2);
  });

  it('preserves Home Assistant Ingress cleanup without installing update monitors', async () => {
    const firstRegistration = {
      ...createRegistration(),
      scope: 'http://localhost/api/hassio_ingress/token/',
      unregister: vi.fn(async () => true),
    };
    const secondRegistration = {
      ...createRegistration(),
      scope: 'http://localhost/api/hassio_ingress/other/',
      unregister: vi.fn(async () => true),
    };
    const container = installServiceWorkerContainer({
      registration: null,
      registrations: [firstRegistration, secondRegistration],
    });
    window.history.replaceState({}, '', '/api/hassio_ingress/token/dashboard');

    registerPwaServiceWorker();
    await flushAsyncWork();

    expect(pwaRegisterHarness.register).not.toHaveBeenCalled();
    expect(container.getRegistrations).toHaveBeenCalledOnce();
    expect(firstRegistration.unregister).toHaveBeenCalledOnce();
    expect(secondRegistration.unregister).toHaveBeenCalledOnce();

    vi.advanceTimersByTime(PWA_UPDATE_CHECK_INTERVAL_MS);
    expect(container.getRegistration).not.toHaveBeenCalled();
  });
});
