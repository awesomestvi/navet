import { useEffect } from 'react';

interface UseMediaPlaybackProgressParams {
  isPlaying: boolean;
  durationSeconds: number;
  liveAttrs: Record<string, unknown> | undefined;
  initialElapsedSeconds?: number;
  initialPositionUpdatedAt?: string;
  setElapsedSeconds: (seconds: number) => void;
}

export function useMediaPlaybackProgress({
  isPlaying,
  durationSeconds,
  liveAttrs,
  initialElapsedSeconds,
  initialPositionUpdatedAt,
  setElapsedSeconds,
}: UseMediaPlaybackProgressParams) {
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const positionUpdatedAt =
      typeof liveAttrs?.media_position_updated_at === 'string'
        ? liveAttrs.media_position_updated_at
        : initialPositionUpdatedAt;
    const baseElapsedSeconds =
      typeof liveAttrs?.media_position === 'number'
        ? liveAttrs.media_position
        : (initialElapsedSeconds ?? 0);

    const getBaseElapsed = () => {
      if (!positionUpdatedAt) {
        return baseElapsedSeconds;
      }
      const updatedAtMs = Date.parse(positionUpdatedAt);
      if (Number.isNaN(updatedAtMs)) {
        return baseElapsedSeconds;
      }
      const driftSeconds = Math.max(0, Math.floor((Date.now() - updatedAtMs) / 1000));
      return baseElapsedSeconds + driftSeconds;
    };

    const syncElapsed = () => {
      const nextElapsed = Math.min(
        durationSeconds || Number.POSITIVE_INFINITY,
        Math.max(0, getBaseElapsed())
      );
      setElapsedSeconds(nextElapsed);
    };

    syncElapsed();
    const timerId = window.setInterval(syncElapsed, 1000);
    return () => window.clearInterval(timerId);
  }, [
    durationSeconds,
    isPlaying,
    liveAttrs,
    initialElapsedSeconds,
    initialPositionUpdatedAt,
    setElapsedSeconds,
  ]);
}
