import { memo } from 'react';
import { Text } from '@/app/components/primitives';
import type { EnergyRangeSnapshot } from '../../types/energy.types';
import { EnergySparkline } from '../charts/energy-sparkline';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface LiveConsumptionChartProps {
  title: string;
  eyebrow: string;
  snapshot: EnergyRangeSnapshot;
  accentColor: string;
}

export const LiveConsumptionChart = memo(function LiveConsumptionChart({
  title,
  eyebrow,
  snapshot,
  accentColor,
}: LiveConsumptionChartProps) {
  return (
    <EnergyWidgetShell title={title} eyebrow={eyebrow}>
      <div className="space-y-4">
        <div>
          <div className="text-4xl font-semibold tracking-tight">
            {snapshot.totalUsageKWh.toFixed(1)} kWh
          </div>
          <Text tone="muted" className="mt-1 text-sm">
            Live usage trend for the selected range.
          </Text>
        </div>

        <div className="h-36">
          <EnergySparkline
            data={snapshot.liveConsumption.map((point) => ({ value: point.value }))}
            accentColor={accentColor}
            height={120}
            showYAxisMarks
            className="h-full w-full"
          />
        </div>

        <div className="flex items-center justify-between gap-3 overflow-hidden text-xs text-white/64">
          {snapshot.liveConsumption.map((point, index) => (
            <div
              key={`${point.label || 'tick'}-${index}`}
              className="min-w-0 flex-1 truncate text-center first:text-left last:text-right"
            >
              {point.label}
            </div>
          ))}
        </div>
      </div>
    </EnergyWidgetShell>
  );
});
