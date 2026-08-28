import { TrendSparkline } from '@navet/app/components/charts/trend-sparkline';
import { memo } from 'react';
import type { SensorStatisticsPoint } from '../hooks/use-sensor-statistics-history';

interface SensorHistorySparklineProps {
  data: SensorStatisticsPoint[];
  accentColor: string;
  className?: string;
  height?: number;
  ariaLabel: string;
}

export const SensorHistorySparkline = memo(function SensorHistorySparkline({
  data,
  accentColor,
  className,
  height = 120,
  ariaLabel,
}: SensorHistorySparklineProps) {
  if (data.length < 2) {
    return null;
  }

  return (
    <div data-testid="sensor-history-sparkline" className="absolute inset-0 z-20">
      <TrendSparkline
        data={data}
        accentColor={accentColor}
        ariaLabel={ariaLabel}
        height={height}
        className={`h-full w-full ${className ?? ''}`.trim()}
        padX={0}
        showYAxisMarks
      />
    </div>
  );
});
