import { useEffect } from 'react';

export function useSwitchResetTimerCleanup(resetTimerRef: React.MutableRefObject<number | null>) {
  useEffect(() => {
    return () => {
      if (resetTimerRef.current !== null) clearTimeout(resetTimerRef.current);
    };
  }, [resetTimerRef]);
}
