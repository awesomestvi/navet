import { startTransition, useEffect, useState } from 'react';

const INITIAL_BATCH = 8;
const BATCH_SIZE = 8;
const EDIT_MODE_INITIAL_BATCH = 16;
const EDIT_MODE_BATCH_SIZE = 16;

type IdleCallbackHandle = number;
type IdleDeadlineLike = { didTimeout: boolean; timeRemaining: () => number };
type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    cb: (deadline: IdleDeadlineLike) => void,
    opts?: { timeout: number }
  ) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

/**
 * Progressively reveals items in batches using idle callbacks (with setTimeout fallback).
 * Returns the number of items that should be visible. In edit mode or when disabled,
 * returns Infinity or 0 respectively so callers can use `array.slice(0, visibleCount)` uniformly.
 */
export function useProgressiveBatching(
  totalCount: number,
  isEditMode: boolean,
  enabled = true
): number {
  const [visibleCount, setVisibleCount] = useState(() => {
    if (!enabled) return 0;
    if (isEditMode) return Infinity;
    return Math.min(INITIAL_BATCH, totalCount);
  });

  useEffect(() => {
    if (!enabled) {
      setVisibleCount(0);
      return;
    }

    if (isEditMode) {
      setVisibleCount(Infinity);
      return;
    }

    const initialBatch = isEditMode ? EDIT_MODE_INITIAL_BATCH : INITIAL_BATCH;
    setVisibleCount(Math.min(initialBatch, totalCount));

    if (totalCount <= initialBatch) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: IdleCallbackHandle | null = null;
    const idleWindow = window as WindowWithIdleCallback;

    const scheduleNextBatch = () => {
      const runBatch = () => {
        if (cancelled) return;
        const batchSize = isEditMode ? EDIT_MODE_BATCH_SIZE : BATCH_SIZE;
        startTransition(() => {
          setVisibleCount((current) => {
            if (current >= totalCount) return current;
            const next = Math.min(current + batchSize, totalCount);
            if (next < totalCount) scheduleNextBatch();
            return next;
          });
        });
      };

      if (typeof idleWindow.requestIdleCallback === 'function') {
        idleId = idleWindow.requestIdleCallback(
          (deadline) => {
            idleId = null;
            if (deadline.didTimeout || deadline.timeRemaining() > 4) {
              runBatch();
            } else {
              scheduleNextBatch();
            }
          },
          { timeout: 160 }
        );
        return;
      }

      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        runBatch();
      }, 96);
    };

    scheduleNextBatch();

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, [enabled, isEditMode, totalCount]);

  return visibleCount;
}
