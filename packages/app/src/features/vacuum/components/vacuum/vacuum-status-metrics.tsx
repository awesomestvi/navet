import { useI18n } from '@navet/app/hooks';
import { Battery, type LucideIcon, Sparkles, Wind } from 'lucide-react';
import type { CSSProperties } from 'react';
import { MetricCard } from './vacuum-metric-card';

interface VacuumStatusMetricsProps {
  battery?: number;
  cleanedArea?: string;
  cleaningTime?: string;
  sectionStyle?: CSSProperties;
}

interface VacuumStatusMetricItem {
  key: string;
  icon: LucideIcon;
  label: string;
  value: string;
}

export function VacuumStatusMetrics({
  battery,
  cleanedArea,
  cleaningTime,
  sectionStyle,
}: VacuumStatusMetricsProps) {
  const { t } = useI18n();
  const metricItems: VacuumStatusMetricItem[] = [
    typeof battery === 'number'
      ? {
          key: 'battery',
          icon: Battery,
          label: t('vacuum.settings.battery'),
          value: `${battery}%`,
        }
      : null,
    cleanedArea
      ? {
          key: 'area',
          icon: Sparkles,
          label: t('vacuum.metric.area'),
          value: cleanedArea,
        }
      : null,
    cleaningTime
      ? {
          key: 'runtime',
          icon: Wind,
          label: t('vacuum.metric.runTime'),
          value: cleaningTime,
        }
      : null,
  ].filter((item): item is VacuumStatusMetricItem => item !== null);

  if (metricItems.length === 0) {
    return null;
  }

  return (
    <div
      className={`grid gap-2 ${
        metricItems.length === 1
          ? 'sm:grid-cols-1'
          : metricItems.length === 2
            ? 'sm:grid-cols-2'
            : 'sm:grid-cols-3'
      }`}
    >
      {metricItems.map((metric) => (
        <MetricCard
          key={metric.key}
          icon={metric.icon}
          label={metric.label}
          value={metric.value}
          className="bg-white/7"
          style={sectionStyle}
        />
      ))}
    </div>
  );
}
