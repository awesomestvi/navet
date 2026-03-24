import { Bolt } from 'lucide-react';
import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import type { EnergySeriesPoint } from '../../types/energy.types';
import { EnergySparkline } from '../charts/energy-sparkline';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyNowWidgetProps {
  currentLoadW: number;
  gridImportW: number;
  trend: EnergySeriesPoint[];
  accentColor: string;
}

export const EnergyNowWidget = memo(function EnergyNowWidget({
  currentLoadW,
  gridImportW,
  trend,
  accentColor,
}: EnergyNowWidgetProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const maxTickCount = 6;
  const tickStep = Math.max(1, Math.floor((trend.length - 1) / Math.max(1, maxTickCount - 1)));
  const trendTicks = trend.filter(
    (_, index) => index === 0 || index === trend.length - 1 || index % tickStep === 0
  );

  return (
    <EnergyWidgetShell
      title="Power in use now"
      eyebrow="Current load"
      action={<Bolt className={`h-4 w-4 ${surface.textMuted}`} />}
    >
      <div className="grid gap-4 lg:grid-cols-[0.88fr_1.12fr]">
        <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
          <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
            Current power
          </div>
          <div className={`mt-3 text-4xl font-semibold tracking-tight ${surface.textPrimary}`}>
            {Math.round(currentLoadW)} W
          </div>
          <div className={`mt-3 text-sm ${surface.textSecondary}`}>
            {gridImportW > 0
              ? `${Math.round(gridImportW)} W currently coming from the grid`
              : 'No active grid import right now'}
          </div>
        </div>

        <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
          <div className="flex items-center justify-between gap-3">
            <div>
              <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
                5-minute sparkline
              </div>
              <div className={`mt-1 text-sm ${surface.textSecondary}`}>
                Last 24 hours, Home Assistant 5-minute mean
              </div>
            </div>
            <div className={`text-xs ${surface.textMuted}`}>W</div>
          </div>

          <div className="mt-4">
            <EnergySparkline
              data={trend.map((point) => ({
                value: point.value,
                timestampMs: point.timestampMs,
                endTimestampMs: point.endTimestampMs,
                minValue: point.minValue,
                maxValue: point.maxValue,
              }))}
              accentColor={accentColor}
              height={54}
            />
          </div>

          <div
            className={`mt-3 flex items-center justify-between gap-3 text-[11px] ${surface.textMuted}`}
          >
            {trendTicks.map((point, index) => (
              <div key={`${point.label || 'tick'}-${index}`} className="min-w-0 whitespace-nowrap">
                {point.label}
              </div>
            ))}
          </div>
        </div>
      </div>
    </EnergyWidgetShell>
  );
});
