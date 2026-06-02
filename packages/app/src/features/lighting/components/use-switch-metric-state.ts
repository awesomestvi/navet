import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import type { DeviceMetric } from '@navet/app/types/device.types';
import { storage } from '@navet/app/utils/storage';
import { useEffect, useMemo, useState } from 'react';

function normalizeStoredMetricLabels(value: unknown): string[] {
  if (Array.isArray(value)) {
    return value.filter((label): label is string => typeof label === 'string');
  }
  if (typeof value === 'string' && value.length > 0) {
    return [value];
  }
  return [];
}

function areMetricLabelListsEqual(left: string[], right: string[]) {
  return left.length === right.length && left.every((label, index) => label === right[index]);
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

  const availableMetrics = useMemo(() => allMetrics, [allMetrics]);

  const [hasExplicitMetricPreference, setHasExplicitMetricPreference] = useState<boolean>(
    () => storage.get<unknown>(metricPreferenceKey, null) !== null
  );
  const [selectedMetricLabels, setSelectedMetricLabels] = useState<string[]>(() =>
    normalizeStoredMetricLabels(storage.get<unknown>(metricPreferenceKey, []))
  );

  useEffect(() => {
    setHasExplicitMetricPreference(storage.get<unknown>(metricPreferenceKey, null) !== null);
    setSelectedMetricLabels(
      normalizeStoredMetricLabels(storage.get<unknown>(metricPreferenceKey, []))
    );
  }, [metricPreferenceKey]);

  useEffect(() => {
    const knownMetricLabels = new Set(allMetrics.map((metric) => metric.label));
    const nextLabels = selectedMetricLabels.filter((label) => knownMetricLabels.has(label));
    const fallbackLabels = availableMetrics.slice(0, metricLimit).map((metric) => metric.label);

    if (hasExplicitMetricPreference) {
      return;
    }

    if (nextLabels.length === 0 && availableMetrics.length > 0) {
      if (!areMetricLabelListsEqual(selectedMetricLabels, fallbackLabels)) {
        setSelectedMetricLabels(fallbackLabels);
      }
      return;
    }

    if (!areMetricLabelListsEqual(selectedMetricLabels, nextLabels)) {
      setSelectedMetricLabels(nextLabels);
    }
  }, [
    allMetrics,
    availableMetrics,
    hasExplicitMetricPreference,
    metricLimit,
    selectedMetricLabels,
  ]);

  useEffect(() => {
    storage.set(metricPreferenceKey, selectedMetricLabels);
  }, [metricPreferenceKey, selectedMetricLabels]);

  const handleMetricToggle = (metricLabel: string) => {
    setHasExplicitMetricPreference(true);
    setSelectedMetricLabels((current) => {
      if (current.includes(metricLabel)) return current.filter((label) => label !== metricLabel);
      const orderedCurrent = orderMetricLabelsByAvailability(current, availableMetrics);
      if (orderedCurrent.length >= metricLimit) {
        const removableVisibleLabel = orderedCurrent[orderedCurrent.length - 1];
        return [...current.filter((label) => label !== removableVisibleLabel), metricLabel];
      }
      return [...current, metricLabel];
    });
  };

  const visibleSelectedMetricLabels = orderMetricLabelsByAvailability(
    selectedMetricLabels,
    availableMetrics
  ).slice(0, metricLimit);
  const selectedMetrics = availableMetrics.filter((metric) =>
    visibleSelectedMetricLabels.includes(metric.label)
  );

  return {
    availableMetrics,
    metricLimit,
    selectedMetricLabels,
    selectedMetrics,
    hasMetrics: availableMetrics.length > 0,
    handleMetricToggle,
  };
}
