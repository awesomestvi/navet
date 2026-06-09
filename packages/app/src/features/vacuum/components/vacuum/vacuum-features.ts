import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import type { NavetEntity } from '@navet/core/types';

const VACUUM_FEATURES = {
  pause: 4,
  stop: 8,
  returnHome: 16,
  fanSpeed: 32,
  locate: 512,
  cleanSpot: 1024,
  start: 8192,
} as const;

export interface VacuumCapabilities {
  canStart: boolean;
  canPause: boolean;
  canStop: boolean;
  canReturnHome: boolean;
  canLocate: boolean;
  canCleanSpot: boolean;
  canSetFanSpeed: boolean;
  currentFanSpeed?: string;
  fanSpeedOptions: string[];
  canCycleFanSpeed: boolean;
}

function readSupportedFeatures(
  providerEntity?: NavetEntity | null,
  vacuumEntity?: PlatformEntitySnapshot
): number | undefined {
  const providerAttrs = providerEntity?.attributes as Record<string, unknown> | undefined;
  const providerValue = providerAttrs?.supportedFeatures;
  if (typeof providerValue === 'number' && Number.isFinite(providerValue)) {
    return providerValue;
  }

  const snapshotAttrs = vacuumEntity?.attributes as Record<string, unknown> | undefined;
  const snapshotValue = snapshotAttrs?.supported_features;
  return typeof snapshotValue === 'number' && Number.isFinite(snapshotValue)
    ? snapshotValue
    : undefined;
}

function hasFeature(supportedFeatures: number | undefined, feature: number): boolean {
  return typeof supportedFeatures === 'number' && (supportedFeatures & feature) === feature;
}

function readFanSpeedValue(
  providerEntity?: NavetEntity | null,
  vacuumEntity?: PlatformEntitySnapshot
): string | undefined {
  const providerAttrs = providerEntity?.attributes as Record<string, unknown> | undefined;
  if (typeof providerAttrs?.fanSpeed === 'string' && providerAttrs.fanSpeed.length > 0) {
    return providerAttrs.fanSpeed;
  }

  const snapshotAttrs = vacuumEntity?.attributes as Record<string, unknown> | undefined;
  return typeof snapshotAttrs?.fan_speed === 'string' && snapshotAttrs.fan_speed.length > 0
    ? snapshotAttrs.fan_speed
    : undefined;
}

function readFanSpeedOptions(
  providerEntity?: NavetEntity | null,
  vacuumEntity?: PlatformEntitySnapshot
): string[] {
  const providerAttrs = providerEntity?.attributes as Record<string, unknown> | undefined;
  const providerList = providerAttrs?.fanSpeedList;
  if (Array.isArray(providerList)) {
    const values = providerList.filter(
      (entry): entry is string => typeof entry === 'string' && entry.length > 0
    );
    if (values.length > 0) {
      return values;
    }
  }

  const snapshotAttrs = vacuumEntity?.attributes as Record<string, unknown> | undefined;
  const candidate =
    snapshotAttrs?.fan_speed_list ?? snapshotAttrs?.fan_speeds ?? snapshotAttrs?.preset_modes;
  return Array.isArray(candidate)
    ? candidate.filter((entry): entry is string => typeof entry === 'string' && entry.length > 0)
    : [];
}

export function resolveVacuumCapabilities({
  providerEntity,
  vacuumEntity,
}: {
  providerEntity?: NavetEntity | null;
  vacuumEntity?: PlatformEntitySnapshot;
}): VacuumCapabilities {
  const supportedFeatures = readSupportedFeatures(providerEntity, vacuumEntity);
  const fanSpeedOptions = readFanSpeedOptions(providerEntity, vacuumEntity);
  const currentFanSpeed = readFanSpeedValue(providerEntity, vacuumEntity);
  const hasFanSpeedList = fanSpeedOptions.length > 0;
  const canSetFanSpeed =
    hasFeature(supportedFeatures, VACUUM_FEATURES.fanSpeed) || hasFanSpeedList === true;

  return {
    canStart:
      hasFeature(supportedFeatures, VACUUM_FEATURES.start) || supportedFeatures === undefined,
    canPause: hasFeature(supportedFeatures, VACUUM_FEATURES.pause),
    canStop: hasFeature(supportedFeatures, VACUUM_FEATURES.stop),
    canReturnHome:
      hasFeature(supportedFeatures, VACUUM_FEATURES.returnHome) || supportedFeatures === undefined,
    canLocate: hasFeature(supportedFeatures, VACUUM_FEATURES.locate),
    canCleanSpot: hasFeature(supportedFeatures, VACUUM_FEATURES.cleanSpot),
    canSetFanSpeed,
    currentFanSpeed,
    fanSpeedOptions,
    canCycleFanSpeed: canSetFanSpeed && fanSpeedOptions.length >= 2,
  };
}
