import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { EnergyConsumer } from '@/app/features/energy/types/energy.types';
import {
  formatEnergyPercent,
  formatEnergyValue,
} from '@/app/features/energy/utils/energy-formatters';
import { useI18n, useTheme } from '@/app/hooks';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyConsumersWidgetProps {
  consumers: EnergyConsumer[];
}

export const EnergyConsumersWidget = memo(function EnergyConsumersWidget({
  consumers,
}: EnergyConsumersWidgetProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.consumers.title')}
      eyebrow={t('energy.widgets.consumers.eyebrow')}
    >
      {consumers.length === 0 ? (
        <p className={`text-sm ${surface.textMuted}`}>{t('energy.widgets.consumers.empty')}</p>
      ) : null}
      <div className="space-y-3">
        {consumers.slice(0, 5).map((consumer) => (
          <div
            key={consumer.id}
            className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                  {consumer.name}
                </div>
                <div className={`mt-1 text-xs ${surface.textSecondary}`}>
                  {consumer.room} •{' '}
                  {t('energy.widgets.consumers.loadShare', {
                    value: formatEnergyPercent(consumer.shareOfLoad * 100),
                  })}
                </div>
              </div>
              <div className="text-right">
                {consumer.powerW > 0 ? (
                  <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                    {formatEnergyValue(consumer.powerW / 1000)} kW
                  </div>
                ) : null}
                {consumer.energyKWh > 0 ? (
                  <div
                    className={`text-sm font-semibold ${consumer.powerW > 0 ? surface.textSecondary : surface.textPrimary}`}
                  >
                    {t('energy.widgets.consumers.kwhToday', {
                      value: formatEnergyValue(consumer.energyKWh, 2),
                    })}
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        ))}
      </div>
    </EnergyWidgetShell>
  );
});
