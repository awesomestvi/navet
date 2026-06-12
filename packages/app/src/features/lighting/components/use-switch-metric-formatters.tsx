import { iconMap } from '@navet/app/features/sensors/components/sensors';
import type { DeviceMetric } from '@navet/app/types/device.types';
import {
  compactRepeatedDeviceLabel,
  compactRepeatedLabelGroup,
} from '@navet/app/utils/compact-device-label';
import { Power } from 'lucide-react';
import { useCallback } from 'react';

interface UseSwitchMetricFormattersParams {
  deviceName: string;
  metricLabels?: readonly string[];
  labels: {
    power: string;
    voltage: string;
    energy: string;
  };
}

function normalizePrefixWord(word: string) {
  return word.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

function compactLabelByDeviceName(metricLabel: string, deviceName: string) {
  const labelWords = metricLabel.trim().split(/\s+/);
  const deviceWords = deviceName.trim().split(/\s+/);
  let sharedPrefixWordCount = 0;

  for (let index = 0; index < Math.min(labelWords.length, deviceWords.length); index += 1) {
    const labelWord = normalizePrefixWord(labelWords[index]);
    const deviceWord = normalizePrefixWord(deviceWords[index]);

    if (!labelWord || labelWord !== deviceWord) {
      break;
    }

    sharedPrefixWordCount = index + 1;
  }

  if (sharedPrefixWordCount === 0 || sharedPrefixWordCount >= labelWords.length) {
    return metricLabel;
  }

  return labelWords.slice(sharedPrefixWordCount).join(' ');
}

export function getSwitchMetricDisplayLabel(
  metricLabel: string,
  deviceName: string,
  metricLabels: readonly string[] = []
) {
  const compactByExactDeviceName = compactLabelByDeviceName(metricLabel, deviceName);
  if (compactByExactDeviceName !== metricLabel) {
    return compactByExactDeviceName;
  }

  const compactByDeviceName = compactRepeatedDeviceLabel(metricLabel, deviceName, metricLabels);
  if (compactByDeviceName !== metricLabel) {
    return compactByDeviceName;
  }

  return compactRepeatedLabelGroup(metricLabel, metricLabels);
}

export function useSwitchMetricFormatters({
  deviceName,
  metricLabels = [],
  labels,
}: UseSwitchMetricFormattersParams) {
  const formatPower = useCallback((watts?: number) => {
    if (watts == null) {
      return null;
    }
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(1)} kW`;
    }
    return `${watts} W`;
  }, []);

  const formatGenericNumericMetric = useCallback((value: number, unit: string) => {
    const precision = unit === 'kWh' || Math.abs(value) < 10 ? 2 : !Number.isInteger(value) ? 1 : 0;
    const formatted = Number(value.toFixed(precision)).toString();
    return `${formatted}${unit ? ` ${unit}` : ''}`;
  }, []);

  const formatMetricValue = useCallback(
    (metric: DeviceMetric) =>
      typeof metric.value === 'number'
        ? metric.label === 'Power'
          ? formatPower(metric.value)
          : formatGenericNumericMetric(metric.value, metric.unit)
        : metric.value,
    [formatGenericNumericMetric, formatPower]
  );

  const getMetricLabel = useCallback(
    (metric: DeviceMetric) => {
      switch (metric.label) {
        case 'Power':
          return labels.power;
        case 'Voltage':
          return labels.voltage;
        case 'Energy':
          return labels.energy;
        default:
          return getSwitchMetricDisplayLabel(metric.label, deviceName, metricLabels);
      }
    },
    [deviceName, labels.energy, labels.power, labels.voltage, metricLabels]
  );

  const renderMetricIcon = useCallback((metric: DeviceMetric, className: string) => {
    const Icon = iconMap[metric.icon] ?? Power;
    return <Icon className={className} />;
  }, []);

  return {
    formatMetricValue,
    getMetricLabel,
    renderMetricIcon,
  };
}
