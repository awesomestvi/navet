import { settingsSelectors } from '@navet/app/stores/selectors';
import { type EffectsQuality, useSettingsStore } from '@navet/app/stores/settings-store';
import { detectDeviceTier } from '@navet/app/utils/detect-device-tier';
import { useEffect } from 'react';

const SAMPLE_FRAME_COUNT = 90;
const INTERACTION_SAMPLE_FRAME_COUNT = 60;
const SAMPLE_START_DELAY_MS = 250;
const INTERACTION_SAMPLE_COOLDOWN_MS = 15_000;
const INTERACTION_EVENTS = ['pointerdown', 'touchstart', 'wheel', 'scroll'] as const;
const PASSIVE_LISTENER_OPTIONS = { passive: true, capture: true } as const;
const QUALITY_RANK: Record<EffectsQuality, number> = { low: 0, medium: 1, high: 2 };
let consecutiveUpgradeSamples = 0;

type SampleKind = 'initial' | 'interaction';

interface ActiveFrameSample {
  interactionStartedAt: number | null;
  firstInteractionFrameDelay: number | null;
  kind: SampleKind;
  targetFrameCount: number;
  previousFrameTime: number | null;
  frameDurations: number[];
}

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

export function resolveInteractionEffectsQuality(
  frameDurations: readonly number[],
  firstFrameDelay: number | null
): EffectsQuality {
  const frameQuality = resolveMeasuredEffectsQuality(frameDurations);
  const responsivenessQuality =
    firstFrameDelay !== null && firstFrameDelay >= 50
      ? 'low'
      : firstFrameDelay !== null && firstFrameDelay >= 24
        ? 'medium'
        : 'high';

  return QUALITY_RANK[frameQuality] <= QUALITY_RANK[responsivenessQuality]
    ? frameQuality
    : responsivenessQuality;
}

/**
 * Samples real frame delivery after dashboard navigation and during occasional user interactions.
 * Automatic quality degrades immediately when the browser misses frames, but needs three healthy
 * navigation samples before upgrading again. Interaction samples are downgrade-only.
 */
export function useAdaptiveEffectsQuality(sampleKey: string) {
  const effectsQualityUserOverride = useSettingsStore((state) => state.effectsQualityUserOverride);
  const updateSettings = useSettingsStore(settingsSelectors.updateSettings);

  useEffect(() => {
    if (effectsQualityUserOverride) {
      return;
    }

    const deviceTier = detectDeviceTier();
    if (deviceTier === 'low') {
      consecutiveUpgradeSamples = 0;
      if (useSettingsStore.getState().effectsQuality !== 'low') {
        updateSettings({ effectsQuality: 'low' });
      }
      return;
    }

    let cancelled = false;
    let frameId: number | null = null;
    let activeSample: ActiveFrameSample | null = null;
    let initialSamplePending = false;
    let lastInteractionSampleTime = Number.NEGATIVE_INFINITY;

    const finishSample = (sample: ActiveFrameSample) => {
      const measuredQuality = capEffectsQualityToDeviceTier(
        sample.kind === 'interaction'
          ? resolveInteractionEffectsQuality(
              sample.frameDurations,
              sample.firstInteractionFrameDelay
            )
          : resolveMeasuredEffectsQuality(sample.frameDurations),
        deviceTier
      );
      const currentQuality = useSettingsStore.getState().effectsQuality;

      if (
        sample.kind === 'interaction' &&
        QUALITY_RANK[measuredQuality] >= QUALITY_RANK[currentQuality]
      ) {
        return;
      }

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

    const cancelActiveSample = (retryInitial: boolean) => {
      if (retryInitial && activeSample?.kind === 'initial') {
        initialSamplePending = true;
      }
      activeSample = null;
      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
        frameId = null;
      }
    };

    const sampleFrame = (frameTime: number) => {
      frameId = null;
      const sample = activeSample;
      if (cancelled || !sample) return;
      if (document.visibilityState === 'hidden') {
        cancelActiveSample(true);
        return;
      }

      if (
        sample.kind === 'interaction' &&
        sample.firstInteractionFrameDelay === null &&
        sample.interactionStartedAt !== null
      ) {
        sample.firstInteractionFrameDelay = Math.max(0, frameTime - sample.interactionStartedAt);
      }
      if (sample.previousFrameTime !== null) {
        sample.frameDurations.push(frameTime - sample.previousFrameTime);
      }
      sample.previousFrameTime = frameTime;

      if (sample.frameDurations.length >= sample.targetFrameCount) {
        activeSample = null;
        finishSample(sample);
        if (sample.kind === 'interaction') {
          tryStartPendingInitialSample();
        }
        return;
      }

      frameId = window.requestAnimationFrame(sampleFrame);
    };

    const startSample = (kind: SampleKind, interactionStartedAt: number | null = null) => {
      if (cancelled || activeSample || document.visibilityState === 'hidden') {
        return false;
      }

      activeSample = {
        interactionStartedAt,
        firstInteractionFrameDelay: null,
        kind,
        targetFrameCount: kind === 'initial' ? SAMPLE_FRAME_COUNT : INTERACTION_SAMPLE_FRAME_COUNT,
        previousFrameTime: null,
        frameDurations: [],
      };
      frameId = window.requestAnimationFrame(sampleFrame);
      return true;
    };

    const tryStartPendingInitialSample = () => {
      if (initialSamplePending && startSample('initial')) {
        initialSamplePending = false;
      }
    };

    const handleInteraction = () => {
      const now = performance.now();
      if (now - lastInteractionSampleTime < INTERACTION_SAMPLE_COOLDOWN_MS) {
        return;
      }

      if (startSample('interaction', now)) {
        lastInteractionSampleTime = now;
      }
    };

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'hidden') {
        cancelActiveSample(true);
        return;
      }
      tryStartPendingInitialSample();
    };

    for (const eventName of INTERACTION_EVENTS) {
      window.addEventListener(eventName, handleInteraction, PASSIVE_LISTENER_OPTIONS);
    }
    document.addEventListener('visibilitychange', handleVisibilityChange);

    const timeoutId = window.setTimeout(() => {
      initialSamplePending = true;
      tryStartPendingInitialSample();
    }, SAMPLE_START_DELAY_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
      cancelActiveSample(false);
      for (const eventName of INTERACTION_EVENTS) {
        window.removeEventListener(eventName, handleInteraction, PASSIVE_LISTENER_OPTIONS);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [effectsQualityUserOverride, sampleKey, updateSettings]);
}
