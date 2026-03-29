import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { EnergySeriesPoint } from '../../types/energy.types';
import { EnergyAreaChart } from '../charts/energy-area-chart';
import { EnergyBarChart } from '../charts/energy-bar-chart';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyTrendWidgetProps {
  trend: EnergySeriesPoint[];
  accentColor: string;
}

export const EnergyTrendWidget = memo(function EnergyTrendWidget({
  trend,
  accentColor,
}: EnergyTrendWidgetProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const barData = trend.map((p) => ({
    label: p.label,
    value: Math.round(p.value * 10) / 10,
    unit: '',
  }));

  const areaData = trend.map((p) => ({
    x: p.label,
    y: Math.round(((p.secondaryValue ?? 0) / Math.max(...trend.map((t) => t.value), 1)) * 100),
  }));

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.trend.title')}
      eyebrow={t('energy.widgets.trend.eyebrow')}
    >
      <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
        <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
          <div className={`mb-3 flex items-end justify-between gap-3`}>
            <div>
              <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
                {t('energy.widgets.trend.consumptionTitle')}
              </div>
              <div className={`mt-1 text-sm ${surface.textSecondary}`}>
                {t('energy.widgets.trend.consumptionDescription')}
              </div>
            </div>
            <div className={`text-xs ${surface.textMuted}`}>kW</div>
          </div>
          <EnergyBarChart data={barData} accentColor={accentColor} />
        </div>

        <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
          <div className={`mb-3 flex items-end justify-between gap-3`}>
            <div>
              <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
                {t('energy.widgets.trend.solarShareTitle')}
              </div>
              <div className={`mt-1 text-sm ${surface.textSecondary}`}>
                {t('energy.widgets.trend.solarShareDescription')}
              </div>
            </div>
            <div className={`text-xs ${surface.textMuted}`}>%</div>
          </div>
          <EnergyAreaChart
            data={areaData}
            accentColor={accentColor}
            yUnit="%"
            yTicks={[0, 50, 100]}
          />
        </div>
      </div>
    </EnergyWidgetShell>
  );
});
