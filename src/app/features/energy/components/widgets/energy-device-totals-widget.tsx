import { PlugZap } from 'lucide-react';
import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { useEnergyLoadHistory } from '../../hooks/use-energy-load-history';
import type { EnergyConsumer } from '../../types/energy.types';
import { EnergySparkline } from '../charts/energy-sparkline';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyDeviceTotalsWidgetProps {
  consumers: EnergyConsumer[];
}

const DeviceHistorySparkline = memo(function DeviceHistorySparkline({
  consumer,
  accentColor,
}: {
  consumer: EnergyConsumer;
  accentColor: string;
}) {
  const history = useEnergyLoadHistory(consumer.powerEntityId, consumer.powerW);

  if (!consumer.powerEntityId || history.length < 2) {
    return null;
  }

  return (
    <div className="mt-3">
      <EnergySparkline
        data={history.map((point) => ({
          value: point.value,
          timestampMs: point.timestampMs,
          endTimestampMs: point.endTimestampMs,
          minValue: point.minValue,
          maxValue: point.maxValue,
        }))}
        accentColor={accentColor}
        height={34}
      />
    </div>
  );
});

export const EnergyDeviceTotalsWidget = memo(function EnergyDeviceTotalsWidget({
  consumers,
}: EnergyDeviceTotalsWidgetProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.deviceTotals.title')}
      eyebrow={t('energy.widgets.common.today')}
      action={<PlugZap className={`h-4 w-4 ${surface.textMuted}`} />}
    >
      <div className="space-y-3">
        {consumers.length === 0 ? (
          <div className={`rounded-3xl border p-4 text-sm ${surface.border} ${surface.textMuted}`}>
            {t('energy.widgets.deviceTotals.empty')}
          </div>
        ) : (
          consumers.map((consumer, index) => (
            <div
              key={consumer.id}
              className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}
            >
              <div className="flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-3">
                    <span className={`text-xs font-medium ${surface.textMuted}`}>
                      {String(index + 1).padStart(2, '0')}
                    </span>
                    <div className={`truncate text-sm font-semibold ${surface.textPrimary}`}>
                      {consumer.name}
                    </div>
                  </div>
                  <div className={`mt-1 pl-8 text-xs ${surface.textSecondary}`}>
                    {consumer.room ?? t('energy.widgets.common.unassignedRoom')}
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
              <DeviceHistorySparkline consumer={consumer} accentColor={accentColor} />
            </div>
          ))
        )}
      </div>
    </EnergyWidgetShell>
  );
});
