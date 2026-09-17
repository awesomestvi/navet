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

it('replaces named timers and drains only the latest queued command', async () => {
  vi.useFakeTimers();
  const runtime = createDashboardSyncBrowserLifecycle();
  const replaced = vi.fn();
  const latest = vi.fn();
  runtime.scheduleNamed('poll', replaced, 50);
  runtime.scheduleNamed('poll', latest, 50);
  vi.advanceTimersByTime(50);
  expect(replaced).not.toHaveBeenCalled();
  expect(latest).toHaveBeenCalledOnce();
  expect(runtime.isRunning('refresh')).toBe(false);

  let releaseFirst: (() => void) | undefined;
  const firstGate = new Promise<void>((resolve) => {
    releaseFirst = resolve;
  });
  const commands: string[] = [];
  const running = runtime.runLatest('refresh', async () => {
    await firstGate;
    commands.push('first');
  });
  void runtime.runLatest('refresh', async () => {
    commands.push('replaced');
  });
  void runtime.runLatest('refresh', async () => {
    commands.push('latest');
  });
  expect(runtime.isRunning('refresh')).toBe(true);
  releaseFirst?.();
  await running;
  expect(commands).toEqual(['first', 'latest']);
  expect(runtime.isRunning('refresh')).toBe(false);
  runtime.dispose();
});
