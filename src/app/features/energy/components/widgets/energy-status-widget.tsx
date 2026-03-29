import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { EnergyStat } from '../../types/energy.types';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyStatusWidgetProps {
  liveStats: EnergyStat[];
  importTodayKWh?: number;
  solarTodayKWh?: number;
}

export const EnergyStatusWidget = memo(function EnergyStatusWidget({
  liveStats,
  importTodayKWh,
  solarTodayKWh,
}: EnergyStatusWidgetProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  const showToday = importTodayKWh !== undefined || solarTodayKWh !== undefined;

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.status.title')}
      eyebrow={t('energy.widgets.status.eyebrow')}
    >
      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {liveStats.map((stat) => (
          <div
            key={stat.label}
            className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}
          >
            <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              {stat.label}
            </div>
            <div className={`mt-3 text-2xl font-semibold ${surface.textPrimary}`}>{stat.value}</div>
          </div>
        ))}
      </div>

      {showToday && (
        <div className={`mt-3 rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
          <div className={`mb-3 text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
            {t('energy.widgets.common.today')}
          </div>
          <div className="flex flex-wrap gap-6">
            {importTodayKWh !== undefined && (
              <div>
                <div className={`text-2xl font-semibold ${surface.textPrimary}`}>
                  {importTodayKWh.toFixed(1)} kWh
                </div>
                <div className={`mt-0.5 text-xs ${surface.textMuted}`}>
                  {t('energy.widgets.status.gridImport')}
                </div>
              </div>
            )}
            {solarTodayKWh !== undefined && solarTodayKWh > 0 && (
              <div>
                <div className={`text-2xl font-semibold ${surface.textPrimary}`}>
                  {solarTodayKWh.toFixed(1)} kWh
                </div>
                <div className={`mt-0.5 text-xs ${surface.textMuted}`}>
                  {t('energy.widgets.status.solarGenerated')}
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </EnergyWidgetShell>
  );
});
