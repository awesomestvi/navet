import { useCallback, useEffect, useRef, useState } from 'react';

const VOLUME_MODE_IDLE_TIMEOUT_MS = 5000;

export function useMediaVolumeMode() {
  const [isVolumeMode, setIsVolumeMode] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const resetTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const clearResetTimer = useCallback(() => {
    if (resetTimerRef.current) {
      clearTimeout(resetTimerRef.current);
      resetTimerRef.current = null;
    }
  }, []);

  const scheduleReset = useCallback(() => {
    clearResetTimer();
    resetTimerRef.current = setTimeout(() => {
      setIsVolumeMode(false);
      resetTimerRef.current = null;
    }, VOLUME_MODE_IDLE_TIMEOUT_MS);
  }, [clearResetTimer]);

  const toggleVolumeMode = useCallback(() => {
    setIsVolumeMode((current) => {
      const next = !current;
      if (next) {
        scheduleReset();
      } else {
        clearResetTimer();
      }
      return next;
    });
  }, [clearResetTimer, scheduleReset]);

  const registerVolumeInteraction = useCallback(() => {
    if (!isVolumeMode) {
      setIsVolumeMode(true);
    }

    scheduleReset();
  }, [isVolumeMode, scheduleReset]);

  const resetVolumeMode = useCallback(() => {
    clearResetTimer();
    setIsVolumeMode(false);
  }, [clearResetTimer]);

  useEffect(() => {
    if (!isVolumeMode) {
      return;
    }

    const handlePointerDown = (event: PointerEvent) => {
      if (containerRef.current?.contains(event.target as Node)) {
        return;
      }

      resetVolumeMode();
    };

    document.addEventListener('pointerdown', handlePointerDown);

    return () => {
      document.removeEventListener('pointerdown', handlePointerDown);
    };
  }, [isVolumeMode, resetVolumeMode]);

  useEffect(() => () => clearResetTimer(), [clearResetTimer]);

  return {
    containerRef,
    isVolumeMode,
    registerVolumeInteraction,
    resetVolumeMode,
    toggleVolumeMode,
  };
}
