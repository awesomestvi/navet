import { describe, expect, it, vi } from 'vitest';
import {
  isHomeAssistantIngressPwaContext,
  PWA_REGISTRATION_FALLBACK_DELAY_MS,
  PWA_REGISTRATION_IDLE_TIMEOUT_MS,
  schedulePwaRegistration,
} from './pwa-registration-scheduler';

type SchedulerTarget = NonNullable<Parameters<typeof schedulePwaRegistration>[1]>;
type SchedulerIdleCallback = Parameters<NonNullable<SchedulerTarget['requestIdleCallback']>>[0];

function createTarget(readyState: DocumentReadyState, supportsIdleCallback = true) {
  let loadListener: (() => void) | null = null;
  let idleCallback: SchedulerIdleCallback | null = null;
  let timeoutCallback: (() => void) | null = null;
  const target = {
    addEventListener: vi.fn((_type: 'load', listener: () => void) => {
      loadListener = listener;
    }),
    cancelIdleCallback: vi.fn(),
    clearTimeout: vi.fn(),
    document: { readyState },
    removeEventListener: vi.fn(),
    requestIdleCallback: supportsIdleCallback
      ? vi.fn((callback: SchedulerIdleCallback) => {
          idleCallback = callback;
          return 41;
        })
      : undefined,
    setTimeout: vi.fn((callback: () => void) => {
      timeoutCallback = callback;
      return 42;
    }),
  };

  return {
    fireIdle: () =>
      idleCallback?.({
        didTimeout: false,
        timeRemaining: () => 50,
      }),
    fireLoad: () => loadListener?.(),
    fireTimeout: () => timeoutCallback?.(),
    target,
  };
}

describe('PWA registration scheduler', () => {
  it('identifies Home Assistant ingress before deferring registration work', () => {
    expect(
      isHomeAssistantIngressPwaContext(
        '/api/hassio_ingress/abc/dashboard',
        '/api/hassio_ingress/abc/'
      )
    ).toBe(true);
    expect(isHomeAssistantIngressPwaContext('/dashboard', './')).toBe(true);
    expect(isHomeAssistantIngressPwaContext('/dashboard', '/')).toBe(false);
    expect(isHomeAssistantIngressPwaContext('/dashboard', '')).toBe(false);
  });

  it('waits for page load and then browser idle before registering', () => {
    const register = vi.fn();
    const harness = createTarget('loading');

    schedulePwaRegistration(register, harness.target);

    expect(harness.target.requestIdleCallback).not.toHaveBeenCalled();
    harness.fireLoad();
    expect(harness.target.requestIdleCallback).toHaveBeenCalledWith(expect.any(Function), {
      timeout: PWA_REGISTRATION_IDLE_TIMEOUT_MS,
    });
    expect(register).not.toHaveBeenCalled();
    harness.fireIdle();
    expect(register).toHaveBeenCalledOnce();
  });

  it('uses a short post-load timer when requestIdleCallback is unavailable', () => {
    const register = vi.fn();
    const harness = createTarget('complete', false);

    schedulePwaRegistration(register, harness.target);

    expect(harness.target.setTimeout).toHaveBeenCalledWith(
      expect.any(Function),
      PWA_REGISTRATION_FALLBACK_DELAY_MS
    );
    harness.fireTimeout();
    expect(register).toHaveBeenCalledOnce();
  });

  it('cancels pending idle registration', () => {
    const register = vi.fn();
    const harness = createTarget('complete');

    const cancel = schedulePwaRegistration(register, harness.target);
    cancel();
    harness.fireIdle();

    expect(harness.target.cancelIdleCallback).toHaveBeenCalledWith(41);
    expect(register).not.toHaveBeenCalled();
  });
});
