import { settingsSelectors } from '@navet/app/stores/selectors';
import { type EffectsQuality, useSettingsStore } from '@navet/app/stores/settings-store';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import { useEffect } from 'react';

const SAMPLE_FRAME_COUNT = 90;
const SAMPLE_START_DELAY_MS = 250;
const QUALITY_RANK: Record<EffectsQuality, number> = { low: 0, medium: 1, high: 2 };
let consecutiveUpgradeSamples = 0;

export function resolveMeasuredEffectsQuality(frameDurations: readonly number[]): EffectsQuality {
  if (frameDurations.length < 12) {
    return 'high';
  }

  const sortedDurations = [...frameDurations].sort((left, right) => left - right);
  const p95Index = Math.min(sortedDurations.length - 1, Math.floor(sortedDurations.length * 0.95));
  const p95 = sortedDurations[p95Index] ?? 0;
  const missedFrameRatio =
    frameDurations.filter((duration) => duration > 20).length / frameDurations.length;

  if (p95 >= 30 || missedFrameRatio >= 0.2) {
    return 'low';
  }

  if (p95 >= 20 || missedFrameRatio >= 0.05) {
    return 'medium';
  }

  return 'high';
}

export function capEffectsQualityToDeviceTier(
  measuredQuality: EffectsQuality,
  deviceTier: EffectsQuality
): EffectsQuality {
  return QUALITY_RANK[measuredQuality] <= QUALITY_RANK[deviceTier] ? measuredQuality : deviceTier;
}

/**
 * Samples real frame delivery after dashboard navigation. Automatic quality degrades immediately
 * when the browser misses frames, but needs three healthy samples before upgrading again.
 */
export function useAdaptiveEffectsQuality(sampleKey: string) {
  const effectsQuality = useSettingsStore(settingsSelectors.effectsQuality);
  const effectsQualityUserOverride = useSettingsStore((state) => state.effectsQualityUserOverride);
  const updateSettings = useSettingsStore(settingsSelectors.updateSettings);

  useEffect(() => {
    if (effectsQualityUserOverride || document.visibilityState === 'hidden') {
      return;
    }

    let cancelled = false;
    let frameId: number | null = null;
    let previousFrameTime: number | null = null;
    const frameDurations: number[] = [];

    const finishSample = () => {
      const measuredQuality = capEffectsQualityToDeviceTier(
        resolveMeasuredEffectsQuality(frameDurations),
        detectDeviceTier()
      );
      const currentQuality = useSettingsStore.getState().effectsQuality;
      if (measuredQuality === currentQuality) {
        consecutiveUpgradeSamples = 0;
        return;
      }

      const isDowngrade = QUALITY_RANK[measuredQuality] < QUALITY_RANK[currentQuality];
      if (isDowngrade) {
        consecutiveUpgradeSamples = 0;
        updateSettings({ effectsQuality: measuredQuality });
        return;
      }

      consecutiveUpgradeSamples += 1;
      if (consecutiveUpgradeSamples >= 3) {
        consecutiveUpgradeSamples = 0;
        updateSettings({ effectsQuality: measuredQuality });
      }
    };

    const sampleFrame = (frameTime: number) => {
      if (cancelled) return;
      if (previousFrameTime !== null) {
        frameDurations.push(frameTime - previousFrameTime);
      }
      previousFrameTime = frameTime;

      if (frameDurations.length >= SAMPLE_FRAME_COUNT) {
        finishSample();
        return;
      }

      frameId = window.requestAnimationFrame(sampleFrame);
    };

    const timeoutId = window.setTimeout(() => {
      frameId = window.requestAnimationFrame(sampleFrame);
    }, SAMPLE_START_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [effectsQuality, effectsQualityUserOverride, sampleKey, updateSettings]);
}
