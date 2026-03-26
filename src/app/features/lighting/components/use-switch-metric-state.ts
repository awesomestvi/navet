import { useEffect, useMemo, useState } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { STORAGE_KEYS } from '@/app/constants/storage-keys';
import type { DeviceMetric } from '@/app/types/device.types';
import { storage } from '@/app/utils/storage';

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

interface UseSwitchMetricStateParams {
  id: string;
  size: CardSize;
  isOn: boolean;
  power?: number;
  voltage?: number;
  energy?: number;
  metrics?: DeviceMetric[];
}

export function useSwitchMetricState({
  id,
  size,
  isOn,
  power,
  voltage,
  energy,
  metrics,
}: UseSwitchMetricStateParams) {
  const metricPreferenceKey = `${STORAGE_KEYS.switchCardMetricPreferences}:${id}`;

  const metricLimit = useMemo(() => {
    switch (size) {
      case 'extra-small':
        return 1;
      case 'small':
        return 2;
      case 'medium':
        return 3;
      case 'large':
        return 4;
      default:
        return 2;
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

  const availableMetrics = useMemo(
    () => allMetrics.filter((metric) => isOn || metric.category === 'configuration'),
    [allMetrics, isOn]
  );

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
    const availableMetricLabels = new Set(availableMetrics.map((metric) => metric.label));
    const nextLabels = selectedMetricLabels.filter((label) => availableMetricLabels.has(label));

    if (nextLabels.length === 0 && !hasExplicitMetricPreference) {
      const fallbackLabels = availableMetrics.slice(0, metricLimit).map((metric) => metric.label);
      if (!areMetricLabelListsEqual(selectedMetricLabels, fallbackLabels)) {
        setSelectedMetricLabels(fallbackLabels);
      }
      return;
    }

    if (nextLabels.length > metricLimit) {
      const truncatedLabels = nextLabels.slice(0, metricLimit);
      if (!areMetricLabelListsEqual(selectedMetricLabels, truncatedLabels)) {
        setSelectedMetricLabels(truncatedLabels);
      }
      return;
    }

    if (!areMetricLabelListsEqual(selectedMetricLabels, nextLabels)) {
      setSelectedMetricLabels(nextLabels);
    }
  }, [availableMetrics, hasExplicitMetricPreference, metricLimit, selectedMetricLabels]);

  useEffect(() => {
    storage.set(metricPreferenceKey, selectedMetricLabels);
  }, [metricPreferenceKey, selectedMetricLabels]);

  const handleMetricToggle = (metricLabel: string) => {
    setHasExplicitMetricPreference(true);
    setSelectedMetricLabels((current) => {
      if (current.includes(metricLabel)) return current.filter((label) => label !== metricLabel);
      if (current.length >= metricLimit) return [...current.slice(1), metricLabel];
      return [...current, metricLabel];
    });
  };

  const selectedMetrics = availableMetrics
    .filter((metric) => selectedMetricLabels.includes(metric.label))
    .slice(0, metricLimit);

  return {
    availableMetrics,
    metricLimit,
    selectedMetricLabels,
    selectedMetrics,
    hasMetrics: availableMetrics.length > 0,
    handleMetricToggle,
  };
}
