import { Power } from 'lucide-react';
import { useCallback } from 'react';
import { iconMap } from '@/app/features/sensors';
import type { DeviceMetric } from '@/app/types/device.types';

interface UseSwitchMetricFormattersParams {
  labels: {
    power: string;
    voltage: string;
    energy: string;
  };
}

export function useSwitchMetricFormatters({ labels }: UseSwitchMetricFormattersParams) {
  const formatPower = useCallback((watts?: number) => {
    if (!watts) {
      return null;
    }
    if (watts >= 1000) {
      return `${(watts / 1000).toFixed(1)} kW`;
    }
    return `${watts} W`;
  }, []);

  const formatMetricValue = useCallback(
    (metric: DeviceMetric) =>
      typeof metric.value === 'number'
        ? metric.label === 'Power'
          ? formatPower(metric.value)
          : `${metric.value.toFixed(metric.unit === 'kWh' ? 2 : 0)}${metric.unit ? ` ${metric.unit}` : ''}`
        : metric.value,
    [formatPower]
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
          return metric.label;
      }
    },
    [labels.energy, labels.power, labels.voltage]
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
