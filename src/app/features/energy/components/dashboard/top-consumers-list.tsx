import { memo } from 'react';
import { Text } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { EnergyConsumer } from '@/app/features/energy/types/energy.types';
import {
  formatEnergyPercent,
  formatEnergyValue,
} from '@/app/features/energy/utils/energy-formatters';
import { useTheme } from '@/app/hooks';
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
  const surface = getThemeSurfaceTokens(theme);

  return (
    <EnergyWidgetShell title={title} eyebrow={eyebrow}>
      {consumers.length === 0 ? (
        <Text tone="muted" className="text-sm">
          No device-level consumption is available yet.
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
                  {(consumer.room ?? 'Unassigned').trim()} ·{' '}
                  {formatEnergyPercent(consumer.shareOfLoad * 100)}% of live load
                </Text>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                  {formatEnergyValue(consumer.powerW / 1000)} kW
                </div>
                <Text tone="muted" className="mt-1 text-sm">
                  {formatEnergyValue(consumer.energyKWh)} kWh today
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}
    </EnergyWidgetShell>
  );
});
