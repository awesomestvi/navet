import { useEffect, useMemo, useRef } from 'react';

/** Own the optimistic value until the provider acknowledges it or its grace period expires. */
export function usePendingLightValue(tolerance: number) {
  const value = useRef<number | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const pending = useMemo(() => {
    const clear = () => {
      if (timer.current !== null) clearTimeout(timer.current);
      timer.current = null;
      value.current = null;
    };
    return {
      clear,
      expect(next: number, timeout = 1500) {
        clear();
        value.current = next;
        timer.current = setTimeout(clear, timeout);
      },
      accept(observed: number) {
        if (value.current !== null && Math.abs(observed - value.current) > tolerance) return false;
        clear();
        return true;
      },
    };
  }, [tolerance]);
  useEffect(() => pending.clear, [pending]);
  return pending;
}
