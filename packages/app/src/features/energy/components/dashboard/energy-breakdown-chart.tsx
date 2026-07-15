import { Text } from '@navet/app/components/primitives';
import type { EnergyBreakdownDatum } from '@navet/app/features/energy/types/energy.types';
import { useI18n } from '@navet/app/hooks';
import { memo } from 'react';
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
  const { t } = useI18n();
  return (
    <EnergyWidgetShell title={title} eyebrow={eyebrow}>
      {items.length === 0 ? (
        <Text tone="muted" className="text-sm">
          {t('energy.dashboard.breakdownEmpty')}
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
