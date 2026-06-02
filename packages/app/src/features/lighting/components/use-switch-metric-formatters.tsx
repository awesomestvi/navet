import { iconMap } from '@navet/app/features/sensors/components/sensors';
import type { DeviceMetric } from '@navet/app/types/device.types';
import { Power } from 'lucide-react';
import { useCallback } from 'react';

interface UseSwitchMetricFormattersParams {
  deviceName: string;
  labels: {
    power: string;
    voltage: string;
    energy: string;
  };
}

function normalizePrefixWord(word: string) {
  return word.replace(/[^a-z0-9]/gi, '').toLowerCase();
}

export function getSwitchMetricDisplayLabel(metricLabel: string, deviceName: string) {
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

export function useSwitchMetricFormatters({ deviceName, labels }: UseSwitchMetricFormattersParams) {
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
          return getSwitchMetricDisplayLabel(metric.label, deviceName);
      }
    },
    [deviceName, labels.energy, labels.power, labels.voltage]
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
