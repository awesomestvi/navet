import { Text } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { EnergyConsumer } from '@navet/app/features/energy/types/energy.types';
import {
  formatEnergyPercent,
  formatEnergyValue,
} from '@navet/app/features/energy/utils/energy-formatters';
import { useI18n, useTheme } from '@navet/app/hooks';
import { memo } from 'react';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface TopConsumersListProps {
  title: string;
  eyebrow: string;
  consumers: EnergyConsumer[];
}

export const TopConsumersList = memo(function TopConsumersList({
  title,
  eyebrow,
  consumers,
}: TopConsumersListProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const totalConsumptionTodayKWh = consumers.reduce(
    (total, consumer) => total + Math.max(0, consumer.energyKWh),
    0
  );

  return (
    <EnergyWidgetShell title={title} eyebrow={eyebrow}>
      {consumers.length === 0 ? (
        <Text tone="muted" className="text-sm">
          {t('energy.dashboard.topConsumersEmpty')}
        </Text>
      ) : (
        <div className="space-y-3">
          {consumers.map((consumer, index) => (
            <div
              key={consumer.id}
              className={`flex items-center justify-between gap-4 rounded-[24px] border p-4 ${surface.border} ${surface.panelMuted}`}
            >
              <div className="min-w-0">
                <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                  {index + 1}. {consumer.name}
                </div>
                <Text tone="muted" className="mt-1 text-sm">
                  {(consumer.room ?? t('energy.widgets.common.unassignedRoom')).trim()} ·{' '}
                  {totalConsumptionTodayKWh > 0
                    ? formatEnergyPercent(
                        (Math.max(0, consumer.energyKWh) / totalConsumptionTodayKWh) * 100
                      )
                    : formatEnergyPercent(0)}
                  {t('energy.dashboard.ofConsumptionToday')}
                </Text>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                  {formatEnergyValue(consumer.powerW / 1000)} kW
                </div>
                <Text tone="muted" className="mt-1 text-sm">
                  {t('energy.dashboard.kwhToday', {
                    value: formatEnergyValue(consumer.energyKWh),
                  })}
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}
    </EnergyWidgetShell>
  );
});
