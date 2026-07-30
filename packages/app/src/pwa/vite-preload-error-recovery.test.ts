import { afterEach, describe, expect, it, vi } from 'vitest';
import {
  createVitePreloadErrorHandler,
  resetVitePreloadErrorRecoveryForTests,
} from './vite-preload-error-recovery';

describe('vite preload error recovery', () => {
  afterEach(() => {
    resetVitePreloadErrorRecoveryForTests();
  });

  it('activates a waiting app-shell update before reloading a missing lazy chunk', async () => {
    const values = new Map<string, string>();
    const storage = {
      getItem: vi.fn((key: string) => values.get(key) ?? null),
      setItem: vi.fn((key: string, value: string) => values.set(key, value)),
    };
    const calls: string[] = [];
    const activateUpdate = vi.fn(async () => {
      calls.push('activate');
    });
    const reload = vi.fn();
    const handler = createVitePreloadErrorHandler({
      activateUpdate,
      now: () => 100_000,
      reload: () => {
        calls.push('reload');
        reload();
      },
      storage,
    });
    const event = new Event('vite:preloadError', { cancelable: true });

    handler(event);
    await vi.waitFor(() => expect(reload).toHaveBeenCalledOnce());

    expect(event.defaultPrevented).toBe(true);
    expect(activateUpdate).toHaveBeenCalledOnce();
    expect(calls).toEqual(['activate', 'reload']);
    expect(storage.setItem).toHaveBeenCalledWith('navet:preload-reload-at', '100000');
  });

  it('does not enter a reload loop when the replacement chunk also fails', () => {
    const storage = {
      getItem: vi.fn(() => '100000'),
      setItem: vi.fn(),
    };
    const reload = vi.fn();
    const handler = createVitePreloadErrorHandler({
      activateUpdate: vi.fn(async () => {}),
      now: () => 100_500,
      reload,
      storage,
    });
    const event = new Event('vite:preloadError', { cancelable: true });

    handler(event);

    expect(event.defaultPrevented).toBe(false);
    expect(reload).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
