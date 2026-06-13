import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import { useEffect } from 'react';
import { resolveDashboardPerformanceProfile } from '../../../dashboard/hooks/use-dashboard-performance-mode';

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
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const lowPowerMode = useSettingsStore(settingsSelectors.lowPowerMode);
  const performanceProfile = resolveDashboardPerformanceProfile({
    activeSection: 'media',
    deviceTier: detectDeviceTier(),
    effectsQuality,
    isEditMode: false,
    lowPowerMode,
    visibleCardCount: 1,
    visibleDevices: [],
  });

  useEffect(() => {
    if (!isPlaying) {
      return;
    }

    const hasMediaPosition = typeof mediaPosition === 'number';
    const hasInitialPosition = typeof initialElapsedSeconds === 'number';
    if (!hasMediaPosition && !hasInitialPosition) {
      return;
    }

    const positionUpdatedAt =
      typeof mediaPositionUpdatedAt === 'string'
        ? mediaPositionUpdatedAt
        : initialPositionUpdatedAt;
    const baseElapsedSeconds = hasMediaPosition ? mediaPosition : (initialElapsedSeconds ?? 0);

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
    const timerId = window.setInterval(
      syncElapsed,
      performanceProfile.reducePolling ? 2_000 : 1_000
    );
    return () => window.clearInterval(timerId);
  }, [
    durationSeconds,
    isPlaying,
    mediaPosition,
    mediaPositionUpdatedAt,
    initialElapsedSeconds,
    initialPositionUpdatedAt,
    performanceProfile.reducePolling,
    setElapsedSeconds,
  ]);
}
