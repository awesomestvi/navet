import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { EnergyConsumer } from '../../types/energy.types';
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
                    value: (consumer.shareOfLoad * 100).toFixed(0),
                  })}
                </div>
              </div>
              <div className="text-right">
                {consumer.powerW > 0 ? (
                  <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                    {(consumer.powerW / 1000).toFixed(1)} kW
                  </div>
                ) : null}
                {consumer.energyKWh > 0 ? (
                  <div
                    className={`text-sm font-semibold ${consumer.powerW > 0 ? surface.textSecondary : surface.textPrimary}`}
                  >
                    {t('energy.widgets.consumers.kwhToday', {
                      value: consumer.energyKWh.toFixed(2),
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
