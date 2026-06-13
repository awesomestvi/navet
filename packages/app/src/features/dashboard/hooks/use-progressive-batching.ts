import { PROGRESSIVE_BATCHING_TIMEOUT } from '@navet/app/constants';
import { startTransition, useEffect, useState } from 'react';

const INITIAL_BATCH = 8;
const BATCH_SIZE = 8;
const EDIT_MODE_INITIAL_BATCH = 16;
const EDIT_MODE_BATCH_SIZE = 16;
const IDLE_CALLBACK_TIMEOUT = PROGRESSIVE_BATCHING_TIMEOUT;
const SET_TIMEOUT_FALLBACK = 96;

type IdleCallbackHandle = number;
type IdleDeadlineLike = { didTimeout: boolean; timeRemaining: () => number };
type WindowWithIdleCallback = Window & {
  requestIdleCallback?: (
    cb: (deadline: IdleDeadlineLike) => void,
    opts?: { timeout: number }
  ) => IdleCallbackHandle;
  cancelIdleCallback?: (handle: IdleCallbackHandle) => void;
};

interface ProgressiveBatchingOptions {
  enabled?: boolean;
  initialBatch?: number;
  batchSize?: number;
  idleTimeoutMs?: number;
  timeoutFallbackMs?: number;
}

type ProgressiveBatchingConfig = boolean | ProgressiveBatchingOptions | undefined;

function normalizeProgressiveBatchingConfig(config: ProgressiveBatchingConfig) {
  if (typeof config === 'boolean') {
    return {
      enabled: config,
      initialBatch: INITIAL_BATCH,
      batchSize: BATCH_SIZE,
      idleTimeoutMs: IDLE_CALLBACK_TIMEOUT,
      timeoutFallbackMs: SET_TIMEOUT_FALLBACK,
    };
  }

  return {
    enabled: config?.enabled ?? true,
    initialBatch: config?.initialBatch ?? INITIAL_BATCH,
    batchSize: config?.batchSize ?? BATCH_SIZE,
    idleTimeoutMs: config?.idleTimeoutMs ?? IDLE_CALLBACK_TIMEOUT,
    timeoutFallbackMs: config?.timeoutFallbackMs ?? SET_TIMEOUT_FALLBACK,
  };
}

/**
 * Progressively reveals items in batches using idle callbacks (with setTimeout fallback).
 * Returns the number of items that should be visible. In edit mode or when disabled,
 * returns Infinity or 0 respectively so callers can use `array.slice(0, visibleCount)` uniformly.
 */
export function useProgressiveBatching(
  totalCount: number,
  isEditMode: boolean,
  config: ProgressiveBatchingConfig = true
): number {
  const { enabled, initialBatch, batchSize, idleTimeoutMs, timeoutFallbackMs } =
    normalizeProgressiveBatchingConfig(config);
  const [visibleCount, setVisibleCount] = useState(() => {
    if (!enabled) return 0;
    if (isEditMode) return Infinity;
    return Math.min(initialBatch, totalCount);
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

    const effectiveInitialBatch = isEditMode ? EDIT_MODE_INITIAL_BATCH : initialBatch;
    setVisibleCount(Math.min(effectiveInitialBatch, totalCount));

    if (totalCount <= effectiveInitialBatch) {
      return;
    }

    let cancelled = false;
    let timeoutId: number | null = null;
    let idleId: IdleCallbackHandle | null = null;
    const idleWindow = window as WindowWithIdleCallback;

    const scheduleNextBatch = () => {
      const runBatch = () => {
        if (cancelled) return;
        const effectiveBatchSize = isEditMode ? EDIT_MODE_BATCH_SIZE : batchSize;
        startTransition(() => {
          setVisibleCount((current) => {
            if (current >= totalCount) return current;
            const next = Math.min(current + effectiveBatchSize, totalCount);
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
          { timeout: idleTimeoutMs }
        );
        return;
      }

      timeoutId = window.setTimeout(() => {
        timeoutId = null;
        runBatch();
      }, timeoutFallbackMs);
    };

    scheduleNextBatch();

    return () => {
      cancelled = true;
      if (timeoutId !== null) window.clearTimeout(timeoutId);
      if (idleId !== null && typeof idleWindow.cancelIdleCallback === 'function') {
        idleWindow.cancelIdleCallback(idleId);
      }
    };
  }, [batchSize, enabled, idleTimeoutMs, initialBatch, isEditMode, timeoutFallbackMs, totalCount]);

  return visibleCount;
}
