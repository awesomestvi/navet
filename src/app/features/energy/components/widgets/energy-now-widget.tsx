import { Bolt } from 'lucide-react';
import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { EnergySeriesPoint } from '../../types/energy.types';
import { EnergySparkline } from '../charts/energy-sparkline';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyNowWidgetProps {
  currentLoadW: number;
  todayUsageKWh: number;
  gridImportW: number;
  trend: EnergySeriesPoint[];
  accentColor: string;
  forceTwoColumn?: boolean;
}

export const EnergyNowWidget = memo(function EnergyNowWidget({
  currentLoadW,
  todayUsageKWh,
  gridImportW,
  trend,
  accentColor,
  forceTwoColumn: _forceTwoColumn = false,
}: EnergyNowWidgetProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const maxTickCount = 6;
  const tickStep = Math.max(1, Math.floor((trend.length - 1) / Math.max(1, maxTickCount - 1)));
  const trendTicks = trend.filter(
    (_, index) => index === 0 || index === trend.length - 1 || index % tickStep === 0
  );

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.now.title')}
      eyebrow={t('energy.widgets.now.eyebrow')}
      action={<Bolt className={`h-4 w-4 ${surface.textMuted}`} />}
    >
      <div className="space-y-3">
        <div
          className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}
          style={{
            background: `linear-gradient(180deg, ${accentColor}16 0%, transparent 38%), linear-gradient(180deg, transparent 0%, ${accentColor}08 100%)`,
          }}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
                {t('energy.widgets.now.currentPower')}
              </div>
              <div className={`mt-2 text-4xl font-semibold tracking-tight ${surface.textPrimary}`}>
                {Math.round(currentLoadW)} W
              </div>
            </div>
            <span
              className={`rounded-full border px-2.5 py-1 text-[11px] font-medium ${surface.border} ${surface.textSecondary}`}
            >
              {t('energy.widgets.now.liveBadge')}
            </span>
          </div>

          <div className={`mt-2 text-sm ${surface.textSecondary}`}>
            {gridImportW > 0
              ? t('energy.widgets.now.gridImportActive', { value: Math.round(gridImportW) })
              : t('energy.widgets.now.gridImportInactive')}
          </div>

          <div className="mt-5">
            <EnergySparkline
              data={trend.map((point) => ({
                value: point.value,
                timestampMs: point.timestampMs,
                endTimestampMs: point.endTimestampMs,
                minValue: point.minValue,
                maxValue: point.maxValue,
              }))}
              accentColor={accentColor}
              height={118}
            />
          </div>

          <div
            className={`mt-4 flex items-center justify-between gap-3 overflow-hidden text-[11px] ${surface.textMuted}`}
          >
            {trendTicks.map((point, index) => (
              <div
                key={`${point.label || 'tick'}-${index}`}
                className="min-w-0 flex-1 truncate whitespace-nowrap text-center first:text-left last:text-right"
              >
                {point.label}
              </div>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
            <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              {t('energy.stats.gridImport')}
            </div>
            <div className={`mt-2 text-2xl font-semibold tracking-tight ${surface.textPrimary}`}>
              {Math.round(gridImportW)} W
            </div>
            <div className={`mt-2 text-sm ${surface.textSecondary}`}>
              {gridImportW > 0
                ? t('energy.widgets.now.gridImportActive', { value: Math.round(gridImportW) })
                : t('energy.widgets.now.gridImportInactive')}
            </div>
          </div>

          <div
            className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}
            style={{
              background: `linear-gradient(180deg, ${accentColor}12, transparent 48%)`,
            }}
          >
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
                  {t('energy.widgets.common.today')}
                </div>
                <div className={`mt-2 text-base font-semibold ${surface.textPrimary}`}>
                  {t('energy.widgets.now.totalUsage')}
                </div>
              </div>
              <div
                className="rounded-full px-2.5 py-1 text-[11px] font-medium"
                style={{ backgroundColor: `${accentColor}20`, color: accentColor }}
              >
                kWh
              </div>
            </div>

            <div className={`mt-5 text-2xl font-semibold tracking-tight ${surface.textPrimary}`}>
              {todayUsageKWh.toFixed(1)} kWh
            </div>
            <div className={`mt-2 text-sm ${surface.textSecondary}`}>
              {t('energy.widgets.now.totalUsageDescription')}
            </div>
          </div>
        </div>
      </div>
    </EnergyWidgetShell>
  );
});
