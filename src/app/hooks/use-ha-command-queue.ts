import { useCallback, useEffect, useRef } from 'react';
import { HA_CONTROL_DEBOUNCE_MS } from '@/app/constants/interaction-timing';

export interface HaCommandQueue<T> {
  queue: (value: T, immediate?: boolean) => void;
  cancel: () => void;
}

/**
 * Debounces async HA service calls with in-flight tracking.
 *
 * Queues the latest value and sends after debounceMs. If a request is already
 * in flight when the timer fires, it waits and re-flushes once the request
 * resolves. Exposes cancel() so callers can drop a pending value (e.g. when
 * a color change supersedes a queued temp change).
 */
export function useHaCommandQueue<T>(
  send: (value: T) => Promise<void>,
  debounceMs = HA_CONTROL_DEBOUNCE_MS
): HaCommandQueue<T> {
  // Always-current reference so flush never captures a stale send closure.
  const sendRef = useRef(send);
  sendRef.current = send;

  const queuedRef = useRef<T | null>(null);
  const sendTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inFlightRef = useRef(false);

  // Stable flush — all state accessed via refs, no deps.
  const flush = useCallback(() => {
    if (inFlightRef.current || queuedRef.current === null) return;
    const value = queuedRef.current;
    queuedRef.current = null;
    inFlightRef.current = true;
    void sendRef.current(value).finally(() => {
      inFlightRef.current = false;
      // A new value may have arrived while the request was in flight.
      if (queuedRef.current !== null) flush();
    });
  }, []);

  const queue = useCallback(
    (value: T, immediate = false) => {
      queuedRef.current = value;
      if (sendTimeoutRef.current) {
        clearTimeout(sendTimeoutRef.current);
        sendTimeoutRef.current = null;
      }
      if (immediate) {
        flush();
        return;
      }
      sendTimeoutRef.current = setTimeout(() => {
        sendTimeoutRef.current = null;
        flush();
      }, debounceMs);
    },
    [flush, debounceMs]
  );

  const cancel = useCallback(() => {
    if (sendTimeoutRef.current) {
      clearTimeout(sendTimeoutRef.current);
      sendTimeoutRef.current = null;
    }
    queuedRef.current = null;
  }, []);

  useEffect(
    () => () => {
      if (sendTimeoutRef.current) clearTimeout(sendTimeoutRef.current);
    },
    []
  );

  return { queue, cancel };
}
