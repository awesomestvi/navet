import { afterEach, expect, it, vi } from 'vitest';
import { createDashboardSyncBrowserLifecycle } from '../dashboard-sync-browser-lifecycle';

afterEach(() => vi.useRealTimers());

it('updates browser state before notifying each session and disposes only its own resources', () => {
  vi.useFakeTimers();
  const first = createDashboardSyncBrowserLifecycle();
  const second = createDashboardSyncBrowserLifecycle();
  const events: boolean[] = [];
  const handlers = {
    online: () => events.push(first.online),
    offline: () => events.push(first.online),
    visibility: vi.fn(),
    pagehide: vi.fn(),
  };
  first.listen(handlers);
  second.listen({ ...handlers, offline: vi.fn() });
  window.dispatchEvent(new Event('offline'));
  expect(events).toEqual([false]);
  expect(second.online).toBe(false);
  const abandoned = vi.fn();
  const surviving = vi.fn();
  first.schedule(abandoned, 100);
  second.schedule(surviving, 100);
  first.dispose();
  first.schedule(abandoned, 10);
  window.dispatchEvent(new Event('pagehide'));
  expect(handlers.pagehide).toHaveBeenCalledTimes(1);
  vi.advanceTimersByTime(100);
  expect(abandoned).not.toHaveBeenCalled();
  expect(surviving).toHaveBeenCalledOnce();
  second.dispose();
  expect(vi.getTimerCount()).toBe(0);
});
