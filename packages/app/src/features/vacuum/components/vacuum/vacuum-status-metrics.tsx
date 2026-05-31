import { useI18n } from '@navet/app/hooks';
import { Battery, Sparkles, Wind } from 'lucide-react';
import type { CSSProperties } from 'react';
import { MetricCard } from './vacuum-metric-card';

interface VacuumStatusMetricsProps {
  battery: number;
  cleanedArea: string;
  cleaningTime: string;
  sectionStyle?: CSSProperties;
}

export function VacuumStatusMetrics({
  battery,
  cleanedArea,
  cleaningTime,
  sectionStyle,
}: VacuumStatusMetricsProps) {
  const { t } = useI18n();

  return (
    <div className="grid gap-2 sm:grid-cols-3">
      <MetricCard
        icon={Battery}
        label={t('vacuum.settings.battery')}
        value={`${battery}%`}
        className="bg-white/7"
        style={sectionStyle}
      />
      <MetricCard
        icon={Sparkles}
        label={t('vacuum.metric.area')}
        value={cleanedArea}
        className="bg-white/7"
        style={sectionStyle}
      />
      <MetricCard
        icon={Wind}
        label={t('vacuum.metric.runTime')}
        value={cleaningTime}
        className="bg-white/7"
        style={sectionStyle}
      />
    </div>
  );
}
