import { TrendingUp } from 'lucide-react';
import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyCostWidgetProps {
  costToday: number;
  projectedMonthCost: number;
}

export const EnergyCostWidget = memo(function EnergyCostWidget({
  costToday,
  projectedMonthCost,
}: EnergyCostWidgetProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.cost.title')}
      eyebrow={t('energy.widgets.cost.eyebrow')}
    >
      <div className="grid gap-3">
        <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
          <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
            {t('energy.widgets.common.today')}
          </div>
          <div className={`mt-3 text-3xl font-semibold ${surface.textPrimary}`}>
            ${costToday.toFixed(2)}
          </div>
          <div className={`mt-2 text-sm ${surface.textSecondary}`}>
            {t('energy.widgets.cost.projectedMonth', { value: projectedMonthCost.toFixed(0) })}
          </div>
        </div>
        <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
          <div className={`flex items-center gap-2 text-sm font-medium ${surface.textPrimary}`}>
            <TrendingUp className="h-4 w-4" />
            {t('energy.widgets.cost.savingsTitle')}
          </div>
          <p className={`mt-2 text-sm leading-6 ${surface.textSecondary}`}>
            {t('energy.widgets.cost.savingsBody')}
          </p>
        </div>
      </div>
    </EnergyWidgetShell>
  );
});
