import type { DeviceCollectionKey } from '@navet/app/hooks';
import type { Section } from '@navet/app/navigation/sections';
import type { EffectsQuality } from '@navet/app/stores/settings-store';
import type { DeviceWithType } from '@navet/app/types/device.types';

const HEAVY_DEVICE_TYPES = new Set<DeviceCollectionKey | DeviceWithType['type']>([
  'lights',
  'media',
  'cameras',
  'climate',
  'hvac',
]);

export type DeviceTier = EffectsQuality;

interface DashboardPerformanceModeOptions {
  activeSection: Section;
  deviceTier: DeviceTier;
  effectsQuality: EffectsQuality;
  isEditMode: boolean;
  lowPowerMode: boolean;
  visibleCardCount: number;
  visibleDevices: Iterable<DeviceWithType>;
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

export function resolveDenseDashboardPerformanceMode({
  activeSection,
  deviceTier,
  effectsQuality,
  isEditMode,
  lowPowerMode,
  visibleCardCount,
  visibleDevices,
}: DashboardPerformanceModeOptions): boolean {
  if (isEditMode) {
    return false;
  }

  if (lowPowerMode || effectsQuality === 'low') {
    return true;
  }

  // Keep the full visual treatment on high-tier hardware unless the user has
  // already opted into reduced effects explicitly.
  if (deviceTier === 'high' && effectsQuality === 'high') {
    return false;
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

  return visibleCardCount >= Math.max(8, threshold);
}
