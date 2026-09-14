import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { DeviceMetric } from '@navet/app/types/device.types';
import { storage } from '@navet/app/utils/storage';
import { useEffect, useMemo, useState } from 'react';

type MetricPreference =
  | { version: 1; hiddenLabels: string[]; priorityLabels?: string[] }
  | { legacySelectedLabels: string[] };

function readMetricPreference(key: string): MetricPreference {
  const stored = storage.get<unknown>(key, null);
  if (stored && typeof stored === 'object' && !Array.isArray(stored)) {
    const value = stored as { version?: unknown; hiddenLabels?: unknown; priorityLabels?: unknown };
    if (value.version === 1 && Array.isArray(value.hiddenLabels)) {
      return {
        version: 1,
        hiddenLabels: value.hiddenLabels.filter(
          (label): label is string => typeof label === 'string'
        ),
        ...(Array.isArray(value.priorityLabels)
          ? {
              priorityLabels: value.priorityLabels.filter(
                (label): label is string => typeof label === 'string'
              ),
            }
          : {}),
      };
    }
  }
  const legacyLabels = Array.isArray(stored)
    ? stored.filter((label): label is string => typeof label === 'string')
    : typeof stored === 'string' && stored.length > 0
      ? [stored]
      : [];
  // Earlier defaults wrote empty arrays before readings arrived. Only non-empty
  // legacy selections can be distinguished from those automatic empty defaults.
  return legacyLabels.length > 0
    ? { legacySelectedLabels: legacyLabels }
    : { version: 1, hiddenLabels: [] };
}

function getPreferredMetricLabels(preference: MetricPreference, metrics: DeviceMetric[]) {
  if ('legacySelectedLabels' in preference) return preference.legacySelectedLabels;
  const hiddenLabels = new Set(preference.hiddenLabels);
  const eligibleLabels = metrics
    .map((metric) => metric.label)
    .filter((label) => !hiddenLabels.has(label));
  const priorityLabels =
    preference.priorityLabels?.filter((label) => eligibleLabels.includes(label)) ?? [];
  return [...priorityLabels, ...eligibleLabels.filter((label) => !priorityLabels.includes(label))];
}

function getVisibleMetricLabels(
  preference: MetricPreference,
  metrics: DeviceMetric[],
  limit: number
) {
  const preferredLabels = getPreferredMetricLabels(preference, metrics);
  return (
    'legacySelectedLabels' in preference
      ? orderMetricLabelsByAvailability(preferredLabels, metrics)
      : preferredLabels
  ).slice(0, limit);
}

function orderMetricLabelsByAvailability(metricLabels: string[], availableMetrics: DeviceMetric[]) {
  const selectedLabels = new Set(metricLabels);
  return availableMetrics
    .map((metric) => metric.label)
    .filter((label) => selectedLabels.has(label));
}

interface UseSwitchMetricStateParams {
  id: string;
  size: CardSize;
  power?: number;
  voltage?: number;
  energy?: number;
  metrics?: DeviceMetric[];
}

export function useSwitchMetricState({
  id,
  size,
  power,
  voltage,
  energy,
  metrics,
}: UseSwitchMetricStateParams) {
  const metricPreferenceKey = `${STORAGE_KEYS.switchCardMetricPreferences}:${id}`;

  const metricLimit = useMemo(() => {
    switch (size) {
      case 'tiny':
        return 1;
      case 'extra-small':
        return 2;
      case 'small':
        return 4;
      case 'medium':
        return 6;
      case 'large':
        return 8;
      default:
        return 4;
    }
  }, [size]);

  const fallbackMetrics = useMemo<DeviceMetric[]>(
    () => [
      ...(power != null
        ? [
            {
              label: 'Power',
              value: power,
              unit: 'W',
              icon: 'zap' as const,
              category: 'measurement' as const,
            },
          ]
        : []),
      ...(voltage != null
        ? [
            {
              label: 'Voltage',
              value: voltage,
              unit: 'V',
              icon: 'gauge' as const,
              category: 'measurement' as const,
            },
          ]
        : []),
      ...(energy != null
        ? [
            {
              label: 'Energy',
              value: energy,
              unit: 'kWh',
              icon: 'activity' as const,
              category: 'measurement' as const,
            },
          ]
        : []),
    ],
    [energy, power, voltage]
  );

  const allMetrics = useMemo(
    () => (metrics?.length ? metrics : fallbackMetrics),
    [fallbackMetrics, metrics]
  );

  const availableMetrics = allMetrics;
  const [preferenceState, setPreferenceState] = useState(() => ({
    key: metricPreferenceKey,
    preference: readMetricPreference(metricPreferenceKey),
    persist: false,
  }));

  useEffect(() => {
    setPreferenceState((current) =>
      current.key === metricPreferenceKey
        ? current
        : {
            key: metricPreferenceKey,
            preference: readMetricPreference(metricPreferenceKey),
            persist: false,
          }
    );
  }, [metricPreferenceKey]);

  useEffect(() => {
    if (preferenceState.key === metricPreferenceKey && preferenceState.persist) {
      storage.set(metricPreferenceKey, preferenceState.preference);
    }
  }, [metricPreferenceKey, preferenceState]);

  const preference =
    preferenceState.key === metricPreferenceKey
      ? preferenceState.preference
      : readMetricPreference(metricPreferenceKey);
  const visibleSelectedMetricLabels = getVisibleMetricLabels(
    preference,
    availableMetrics,
    metricLimit
  );
  // Legacy selections retain unavailable labels so a temporarily missing reading
  // returns to the same selection when it comes back.
  const selectedMetricLabels =
    'legacySelectedLabels' in preference
      ? preference.legacySelectedLabels
      : visibleSelectedMetricLabels;
  const selectedMetrics = availableMetrics.filter((metric) =>
    visibleSelectedMetricLabels.includes(metric.label)
  );

  const handleMetricToggle = (metricLabel: string) => {
    if (!availableMetrics.some((metric) => metric.label === metricLabel)) return;
    setPreferenceState((current) => {
      const currentPreference =
        current.key === metricPreferenceKey
          ? current.preference
          : readMetricPreference(metricPreferenceKey);
      const currentLabels = getPreferredMetricLabels(currentPreference, availableMetrics);
      const visibleLabels = getVisibleMetricLabels(
        currentPreference,
        availableMetrics,
        metricLimit
      );
      let priorityLabels =
        'priorityLabels' in currentPreference ? (currentPreference.priorityLabels ?? []) : [];
      const hiddenLabels = new Set(
        'hiddenLabels' in currentPreference
          ? currentPreference.hiddenLabels
          : availableMetrics
              .map((metric) => metric.label)
              .filter((label) => !currentLabels.includes(label))
      );
      if (
        'legacySelectedLabels' in currentPreference
          ? currentLabels.includes(metricLabel)
          : visibleLabels.includes(metricLabel)
      ) {
        hiddenLabels.add(metricLabel);
        priorityLabels = priorityLabels.filter((label) => label !== metricLabel);
      } else {
        hiddenLabels.delete(metricLabel);
        if (visibleLabels.length >= metricLimit) {
          hiddenLabels.add(visibleLabels[visibleLabels.length - 1]);
          priorityLabels = [
            metricLabel,
            ...priorityLabels.filter((label) => label !== metricLabel),
          ];
        }
      }
      return {
        key: metricPreferenceKey,
        preference: {
          version: 1,
          hiddenLabels: [...hiddenLabels],
          ...(priorityLabels.length ? { priorityLabels } : {}),
        },
        persist: true,
      };
    });
  };

  return {
    availableMetrics,
    metricLimit,
    selectedMetricLabels,
    selectedMetrics,
    hasMetrics: availableMetrics.length > 0,
    handleMetricToggle,
  };
}
