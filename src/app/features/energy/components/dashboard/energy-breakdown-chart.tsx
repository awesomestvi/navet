import { memo } from 'react';
import { Text } from '@/app/components/primitives';
import type { EnergyBreakdownDatum } from '../../types/energy.types';
import { EnergyBarChart } from '../charts/energy-bar-chart';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyBreakdownChartProps {
  title: string;
  eyebrow: string;
  items: EnergyBreakdownDatum[];
  accentColor: string;
}

export const EnergyBreakdownChart = memo(function EnergyBreakdownChart({
  title,
  eyebrow,
  items,
  accentColor,
}: EnergyBreakdownChartProps) {
  return (
    <EnergyWidgetShell title={title} eyebrow={eyebrow}>
      {items.length === 0 ? (
        <Text tone="muted" className="text-sm">
          No breakdown is available yet for this range.
        </Text>
      ) : (
        <EnergyBarChart
          data={items.map((item) => ({
            label: item.label,
            value: item.value,
            unit: item.unit,
            alert: item.alert,
          }))}
          accentColor={accentColor}
        />
      )}
    </EnergyWidgetShell>
  );
});
