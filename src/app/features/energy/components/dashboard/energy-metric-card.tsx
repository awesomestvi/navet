import { memo } from 'react';
import { Text } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import type { EnergySummaryMetric } from '../../types/energy.types';

interface EnergyMetricCardProps {
  metric: EnergySummaryMetric;
}

export const EnergyMetricCard = memo(function EnergyMetricCard({ metric }: EnergyMetricCardProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const valueColor =
    metric.tone === 'good'
      ? theme === 'light'
        ? 'text-emerald-700'
        : 'text-emerald-300'
      : metric.tone === 'warn'
        ? theme === 'light'
          ? 'text-orange-700'
          : 'text-orange-300'
        : metric.tone === 'critical'
          ? theme === 'light'
            ? 'text-red-700'
            : 'text-red-300'
          : surface.textPrimary;

  return (
    <div className={`rounded-[24px] border p-4 ${surface.border} ${surface.panelMuted}`}>
      <div className={`text-[11px] font-semibold uppercase tracking-[0.16em] ${surface.textMuted}`}>
        {metric.label}
      </div>
      <div className={`mt-3 text-3xl font-semibold tracking-tight ${valueColor}`}>
        {metric.value}
      </div>
      {metric.caption ? (
        <Text tone="muted" className="mt-1 text-sm">
          {metric.caption}
        </Text>
      ) : null}
    </div>
  );
});
