import { useEffect } from 'react';

interface UseMediaPlaybackProgressParams {
  isPlaying: boolean;
  durationSeconds: number;
  mediaPosition?: number;
  mediaPositionUpdatedAt?: string;
  initialElapsedSeconds?: number;
  initialPositionUpdatedAt?: string;
  setElapsedSeconds: (seconds: number) => void;
}

export function useMediaPlaybackProgress({
  isPlaying,
  durationSeconds,
  mediaPosition,
  mediaPositionUpdatedAt,
  initialElapsedSeconds,
  initialPositionUpdatedAt,
  setElapsedSeconds,
}: UseMediaPlaybackProgressParams) {
  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const positionUpdatedAt =
      typeof mediaPositionUpdatedAt === 'string'
        ? mediaPositionUpdatedAt
        : initialPositionUpdatedAt;
    const baseElapsedSeconds =
      typeof mediaPosition === 'number' ? mediaPosition : (initialElapsedSeconds ?? 0);

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
    mediaPosition,
    mediaPositionUpdatedAt,
    initialElapsedSeconds,
    initialPositionUpdatedAt,
    setElapsedSeconds,
  ]);
}
