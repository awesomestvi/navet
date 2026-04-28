import { memo } from 'react';
import { Text } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import type { EnergyConsumer } from '../../types/energy.types';
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
                  {(consumer.shareOfLoad * 100).toFixed(0)}% of live load
                </Text>
              </div>
              <div className="text-right">
                <div className={`text-sm font-semibold ${surface.textPrimary}`}>
                  {(consumer.powerW / 1000).toFixed(1)} kW
                </div>
                <Text tone="muted" className="mt-1 text-sm">
                  {consumer.energyKWh.toFixed(1)} kWh today
                </Text>
              </div>
            </div>
          ))}
        </div>
      )}
    </EnergyWidgetShell>
  );
});
