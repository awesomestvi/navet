import type { DeviceCollectionKey } from '@navet/app/hooks';
import type { Section } from '@navet/app/navigation/sections';
import type { EffectsQuality } from '@navet/app/stores/settings-store';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { resolveEffectsQuality } from '@navet/app/utils/effects-quality';

const HEAVY_DEVICE_TYPES = new Set<DeviceCollectionKey | DeviceWithType['type']>([
  'lights',
  'media',
  'cameras',
  'climate',
  'hvac',
]);

export type DeviceTier = EffectsQuality;
export type DensePerformanceModeReason =
  | 'edit-mode'
  | 'low-power'
  | 'quality-low'
  | 'high-tier-full-effects'
  | 'card-density'
  | 'none';

interface DashboardPerformanceModeOptions {
  activeSection: Section;
  deviceTier: DeviceTier;
  effectsQuality: EffectsQuality;
  isEditMode: boolean;
  lowPowerMode: boolean;
  reducedEffectsEnabled?: boolean;
  visibleCardCount: number;
  visibleDevices: Iterable<DeviceWithType>;
}

export interface DashboardPerformanceProfile {
  deviceTier: DeviceTier;
  requestedEffectsQuality: EffectsQuality;
  resolvedEffectsQuality: EffectsQuality;
  effectiveEffectsQuality: EffectsQuality;
  activeSection: Section;
  visibleCardCount: number;
  heavyDeviceCount: number;
  densePerformanceMode: boolean;
  densePerformanceModeReason: DensePerformanceModeReason;
  allowAmbientBleed: boolean;
  allowBackdropBlur: boolean;
  allowAnimatedGradients: boolean;
  allowParallax: boolean;
  optimizeOffscreenPaint: boolean;
  preferSnapshotOverLive: boolean;
  batchHeavyCards: boolean;
  reducePolling: boolean;
  progressiveBatchInitialCount: number;
  progressiveBatchSize: number;
}

export function countHeavyDashboardDevices(visibleDevices: Iterable<DeviceWithType>): number {
  let heavyCount = 0;

  for (const device of visibleDevices) {
    if (HEAVY_DEVICE_TYPES.has(device.type)) {
      heavyCount += 1;
    }
  }

  return heavyCount;
}

function resolveBaseThreshold(activeSection: Section) {
  switch (activeSection) {
    case 'media':
    case 'security':
      return 8;
    case 'lights':
      return 12;
    case 'climate':
      return 14;
    case 'home':
      return 16;
    default:
      return 18;
  }
}

function resolveDenseDashboardPerformanceDecision({
  activeSection,
  deviceTier,
  effectsQuality,
  isEditMode,
  lowPowerMode,
  visibleCardCount,
  visibleDevices,
}: DashboardPerformanceModeOptions): {
  densePerformanceMode: boolean;
  reason: DensePerformanceModeReason;
  heavyDeviceCount: number;
} {
  if (isEditMode) {
    return {
      densePerformanceMode: false,
      reason: 'edit-mode',
      heavyDeviceCount: countHeavyDashboardDevices(visibleDevices),
    };
  }

  if (lowPowerMode) {
    return {
      densePerformanceMode: true,
      reason: 'low-power',
      heavyDeviceCount: countHeavyDashboardDevices(visibleDevices),
    };
  }

  if (effectsQuality === 'low') {
    return {
      densePerformanceMode: true,
      reason: 'quality-low',
      heavyDeviceCount: countHeavyDashboardDevices(visibleDevices),
    };
  }

  // Keep the full visual treatment on high-tier hardware unless the user has
  // already opted into reduced effects explicitly.
  if (deviceTier === 'high' && effectsQuality === 'high') {
    return {
      densePerformanceMode: false,
      reason: 'high-tier-full-effects',
      heavyDeviceCount: countHeavyDashboardDevices(visibleDevices),
    };
  }

  const heavyDeviceCount = countHeavyDashboardDevices(visibleDevices);
  let threshold = resolveBaseThreshold(activeSection);

  if (deviceTier === 'low') {
    threshold -= 4;
  } else if (deviceTier === 'medium') {
    threshold -= 2;
  }

  if (heavyDeviceCount >= 8) {
    threshold -= 4;
  } else if (heavyDeviceCount >= 4) {
    threshold -= 2;
  }

  return {
    densePerformanceMode: visibleCardCount >= Math.max(8, threshold),
    reason: visibleCardCount >= Math.max(8, threshold) ? 'card-density' : 'none',
    heavyDeviceCount,
  };
}

export function resolveDashboardPerformanceProfile({
  activeSection,
  deviceTier,
  effectsQuality,
  isEditMode,
  lowPowerMode,
  reducedEffectsEnabled = lowPowerMode,
  visibleCardCount,
  visibleDevices,
}: DashboardPerformanceModeOptions): DashboardPerformanceProfile {
  const resolvedEffectsQuality = resolveEffectsQuality(effectsQuality, reducedEffectsEnabled);
  const { densePerformanceMode, reason, heavyDeviceCount } =
    resolveDenseDashboardPerformanceDecision({
      activeSection,
      deviceTier,
      effectsQuality: resolvedEffectsQuality,
      isEditMode,
      lowPowerMode,
      visibleCardCount,
      visibleDevices,
    });
  const effectiveEffectsQuality =
    densePerformanceMode || lowPowerMode ? 'low' : resolvedEffectsQuality;

  return {
    activeSection,
    deviceTier,
    requestedEffectsQuality: effectsQuality,
    resolvedEffectsQuality,
    effectiveEffectsQuality,
    visibleCardCount,
    heavyDeviceCount,
    densePerformanceMode,
    densePerformanceModeReason: reason,
    allowAmbientBleed: !isEditMode && effectiveEffectsQuality === 'high',
    allowBackdropBlur: effectiveEffectsQuality !== 'low',
    allowAnimatedGradients: effectiveEffectsQuality === 'high',
    allowParallax: effectiveEffectsQuality === 'high',
    optimizeOffscreenPaint: !isEditMode && effectiveEffectsQuality !== 'high',
    preferSnapshotOverLive:
      effectiveEffectsQuality === 'low' || (deviceTier === 'low' && !isEditMode),
    batchHeavyCards:
      !isEditMode &&
      (densePerformanceMode ||
        effectiveEffectsQuality !== 'high' ||
        heavyDeviceCount >= 4 ||
        visibleCardCount >= 12),
    reducePolling:
      densePerformanceMode ||
      effectiveEffectsQuality !== 'high' ||
      (deviceTier !== 'high' && visibleCardCount >= 8),
    progressiveBatchInitialCount:
      effectiveEffectsQuality === 'high' ? 10 : effectiveEffectsQuality === 'medium' ? 8 : 6,
    progressiveBatchSize:
      effectiveEffectsQuality === 'high' ? 10 : effectiveEffectsQuality === 'medium' ? 8 : 6,
  };
}

export function resolveDenseDashboardPerformanceMode(
  options: DashboardPerformanceModeOptions
): boolean {
  return resolveDashboardPerformanceProfile(options).densePerformanceMode;
}
