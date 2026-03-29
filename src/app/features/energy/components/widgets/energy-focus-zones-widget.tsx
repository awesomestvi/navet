import { Bath, Heater } from 'lucide-react';
import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { EnergyConsumer } from '../../types/energy.types';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyFocusZonesWidgetProps {
  todayKWh: number;
  currentPowerW: number;
  consumers: EnergyConsumer[];
}

export const EnergyFocusZonesWidget = memo(function EnergyFocusZonesWidget({
  todayKWh,
  currentPowerW,
  consumers,
}: EnergyFocusZonesWidgetProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.focusZones.title')}
      eyebrow={t('energy.widgets.focusZones.eyebrow')}
      action={<Bath className={`h-4 w-4 ${surface.textMuted}`} />}
    >
      <div className="grid gap-4">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
            <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              {t('energy.widgets.common.today')}
            </div>
            <div className={`mt-3 text-3xl font-semibold ${surface.textPrimary}`}>
              {todayKWh.toFixed(1)} kWh
            </div>
          </div>
          <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
            <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
              {t('energy.widgets.now.currentPower')}
            </div>
            <div className={`mt-3 text-3xl font-semibold ${surface.textPrimary}`}>
              {Math.round(currentPowerW)} W
            </div>
          </div>
        </div>

        <div className="space-y-3">
          {consumers.length === 0 ? (
            <div
              className={`rounded-3xl border p-4 text-sm ${surface.border} ${surface.textMuted}`}
            >
              {t('energy.widgets.focusZones.empty')}
            </div>
          ) : (
            consumers.map((consumer) => (
              <div
                key={consumer.id}
                className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}
              >
                <div className="flex items-center justify-between gap-4">
                  <div className="flex items-start gap-3">
                    <div className={`rounded-2xl border p-2 ${surface.border} ${surface.panel}`}>
                      <Heater className={`h-4 w-4 ${surface.textMuted}`} />
                    </div>
                    <div>
                      <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                        {consumer.name}
                      </div>
                      <div className={`mt-1 text-xs ${surface.textSecondary}`}>
                        {consumer.room ?? t('energy.widgets.common.unassignedRoom')}
                      </div>
                    </div>
                  </div>
                  <div className="text-right">
                    <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                      {consumer.energyKWh.toFixed(2)} kWh
                    </div>
                    <div className={`mt-1 text-xs ${surface.textMuted}`}>
                      {t('energy.widgets.deviceTotals.powerNow', {
                        value: Math.round(consumer.powerW),
                      })}
                    </div>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </EnergyWidgetShell>
  );
});
