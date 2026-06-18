import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import type { NavetEntity } from '@navet/core/types';

const VACUUM_FEATURES = {
  pause: 4,
  stop: 8,
  returnHome: 16,
  fanSpeed: 32,
  locate: 512,
  cleanSpot: 1024,
  map: 2048,
  start: 8192,
} as const;

const LAWN_MOWER_FEATURES = {
  start: 1,
  pause: 2,
  returnHome: 4,
} as const;

export interface VacuumCleaningArea {
  id: string;
  label: string;
}

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
  canShowMap: boolean;
  canCleanByArea: boolean;
  canOrderAreaCleaning: boolean;
  availableCleaningAreas: VacuumCleaningArea[];
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

function isLawnMowerEntity(
  providerEntity?: NavetEntity | null,
  vacuumEntity?: PlatformEntitySnapshot
): boolean {
  return (
    (typeof providerEntity?.externalId === 'string' &&
      providerEntity.externalId.startsWith('lawn_mower.')) ||
    (typeof vacuumEntity?.entityId === 'string' && vacuumEntity.entityId.startsWith('lawn_mower.'))
  );
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

function readAvailableCleaningAreas(
  providerEntity?: NavetEntity | null,
  vacuumEntity?: PlatformEntitySnapshot
): VacuumCleaningArea[] {
  const readCandidate = (value: unknown): VacuumCleaningArea[] => {
    if (!Array.isArray(value)) {
      return [];
    }

    return value.flatMap((entry) => {
      if (!entry || typeof entry !== 'object') {
        return [];
      }

      const id = 'id' in entry && typeof entry.id === 'string' ? entry.id : null;
      const label =
        'label' in entry && typeof entry.label === 'string'
          ? entry.label
          : 'name' in entry && typeof entry.name === 'string'
            ? entry.name
            : null;

      return id && label ? [{ id, label }] : [];
    });
  };

  const providerAttrs = providerEntity?.attributes as Record<string, unknown> | undefined;
  const snapshotAttrs = vacuumEntity?.attributes as Record<string, unknown> | undefined;

  const providerAreas = readCandidate(providerAttrs?.availableCleaningAreas);
  if (providerAreas.length > 0) {
    return providerAreas;
  }

  const snapshotAreas = readCandidate(snapshotAttrs?.availableCleaningAreas);
  return snapshotAreas.length > 0 ? snapshotAreas : [];
}

function readAreaOrderingSupport(
  providerEntity?: NavetEntity | null,
  vacuumEntity?: PlatformEntitySnapshot
): boolean {
  const providerAttrs = providerEntity?.attributes as Record<string, unknown> | undefined;
  if (typeof providerAttrs?.canOrderAreaCleaning === 'boolean') {
    return providerAttrs.canOrderAreaCleaning;
  }

  const snapshotAttrs = vacuumEntity?.attributes as Record<string, unknown> | undefined;
  return snapshotAttrs?.canOrderAreaCleaning === true;
}

export function resolveVacuumCapabilities({
  providerEntity,
  vacuumEntity,
}: {
  providerEntity?: NavetEntity | null;
  vacuumEntity?: PlatformEntitySnapshot;
}): VacuumCapabilities {
  const isLawnMower = isLawnMowerEntity(providerEntity, vacuumEntity);
  const supportedFeatures = readSupportedFeatures(providerEntity, vacuumEntity);
  const fanSpeedOptions = readFanSpeedOptions(providerEntity, vacuumEntity);
  const currentFanSpeed = readFanSpeedValue(providerEntity, vacuumEntity);
  const availableCleaningAreas = readAvailableCleaningAreas(providerEntity, vacuumEntity);
  const canOrderAreaCleaning = readAreaOrderingSupport(providerEntity, vacuumEntity);
  const hasFanSpeedList = fanSpeedOptions.length > 0;
  const canSetFanSpeed =
    !isLawnMower &&
    (hasFeature(supportedFeatures, VACUUM_FEATURES.fanSpeed) || hasFanSpeedList === true);

  return {
    canStart: isLawnMower
      ? hasFeature(supportedFeatures, LAWN_MOWER_FEATURES.start) || supportedFeatures === undefined
      : hasFeature(supportedFeatures, VACUUM_FEATURES.start) || supportedFeatures === undefined,
    canPause: isLawnMower
      ? hasFeature(supportedFeatures, LAWN_MOWER_FEATURES.pause)
      : hasFeature(supportedFeatures, VACUUM_FEATURES.pause),
    canStop: !isLawnMower && hasFeature(supportedFeatures, VACUUM_FEATURES.stop),
    canReturnHome: isLawnMower
      ? hasFeature(supportedFeatures, LAWN_MOWER_FEATURES.returnHome) ||
        supportedFeatures === undefined
      : hasFeature(supportedFeatures, VACUUM_FEATURES.returnHome) ||
        supportedFeatures === undefined,
    canLocate: !isLawnMower && hasFeature(supportedFeatures, VACUUM_FEATURES.locate),
    canCleanSpot: !isLawnMower && hasFeature(supportedFeatures, VACUUM_FEATURES.cleanSpot),
    canSetFanSpeed,
    currentFanSpeed: isLawnMower ? undefined : currentFanSpeed,
    fanSpeedOptions: isLawnMower ? [] : fanSpeedOptions,
    canCycleFanSpeed: canSetFanSpeed && fanSpeedOptions.length >= 2,
    canShowMap: !isLawnMower && hasFeature(supportedFeatures, VACUUM_FEATURES.map),
    canCleanByArea: !isLawnMower && availableCleaningAreas.length > 0,
    canOrderAreaCleaning: !isLawnMower && canOrderAreaCleaning && availableCleaningAreas.length > 1,
    availableCleaningAreas: isLawnMower ? [] : availableCleaningAreas,
  };
}
