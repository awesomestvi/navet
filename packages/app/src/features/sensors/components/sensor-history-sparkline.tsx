import { EnergySparkline } from '@navet/app/features/energy/components/charts/energy-sparkline';
import { memo } from 'react';
import type { SensorStatisticsPoint } from '../hooks/use-sensor-statistics-history';

interface SensorHistorySparklineProps {
  data: SensorStatisticsPoint[];
  accentColor: string;
  className?: string;
  height?: number;
}

export const SensorHistorySparkline = memo(function SensorHistorySparkline({
  data,
  accentColor,
  className,
  height = 120,
}: SensorHistorySparklineProps) {
  if (data.length < 2) {
    return null;
  }

  return (
    <div
      data-testid="sensor-history-sparkline"
      className={`pointer-events-none absolute inset-0 overflow-hidden ${className ?? ''}`}
    >
      <EnergySparkline
        data={data}
        accentColor={accentColor}
        height={height}
        className="h-full w-full opacity-95"
        padX={0}
      />
    </div>
  );
});
