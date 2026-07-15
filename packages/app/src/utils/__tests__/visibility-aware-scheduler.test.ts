import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  subscribeVisibilityAwareAsyncTask,
  subscribeVisibilityAwareTask,
} from '../visibility-aware-scheduler';

describe('visibility-aware scheduler', () => {
  const cleanups: Array<() => void> = [];
  let visibilityState: DocumentVisibilityState;

  beforeEach(() => {
    vi.useFakeTimers();
    visibilityState = 'visible';
    vi.spyOn(document, 'visibilityState', 'get').mockImplementation(() => visibilityState);
  });

  afterEach(() => {
    for (const cleanup of cleanups.splice(0)) {
      cleanup();
    }
    vi.restoreAllMocks();
    vi.useRealTimers();
  });

  it('pauses recurring work while hidden and refreshes once when visible again', () => {
    const callback = vi.fn();
    cleanups.push(subscribeVisibilityAwareTask(callback, 1_000));

    vi.advanceTimersByTime(1_000);
    expect(callback).toHaveBeenCalledTimes(1);

    visibilityState = 'hidden';
    document.dispatchEvent(new Event('visibilitychange'));
    vi.advanceTimersByTime(5_000);
    expect(callback).toHaveBeenCalledTimes(1);

    visibilityState = 'visible';
    document.dispatchEvent(new Event('visibilitychange'));
    expect(callback).toHaveBeenCalledTimes(2);

    vi.advanceTimersByTime(1_000);
    expect(callback).toHaveBeenCalledTimes(3);
  });

  it('does not overlap async refreshes when a request exceeds its cadence', async () => {
    let finishRequest: (() => void) | undefined;
    const callback = vi.fn(
      () =>
        new Promise<void>((resolve) => {
          finishRequest = resolve;
        })
    );
    cleanups.push(
      subscribeVisibilityAwareAsyncTask(callback, 1_000, {
        runImmediately: true,
      })
    );

    expect(callback).toHaveBeenCalledTimes(1);
    vi.advanceTimersByTime(1_000);
    expect(callback).toHaveBeenCalledTimes(1);

    finishRequest?.();
    await Promise.resolve();
    vi.advanceTimersByTime(1_000);
    expect(callback).toHaveBeenCalledTimes(2);
  });
});
