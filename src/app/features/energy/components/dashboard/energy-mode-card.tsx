import { BatteryCharging, Gauge, Leaf, Zap } from 'lucide-react';
import { memo } from 'react';
import { Text } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import type { EnergyDashboardMode } from '../../types/energy.types';

interface EnergyModeCardProps {
  mode: EnergyDashboardMode;
  summary: string;
}

function getModeAppearance(mode: EnergyDashboardMode) {
  switch (mode) {
    case 'eco':
      return {
        label: 'Eco',
        Icon: Leaf,
      };
    case 'peak':
      return {
        label: 'Peak',
        Icon: Zap,
      };
    case 'battery_saver':
      return {
        label: 'Battery Saver',
        Icon: BatteryCharging,
      };
    default:
      return {
        label: 'Normal',
        Icon: Gauge,
      };
  }
}

export const EnergyModeCard = memo(function EnergyModeCard({ mode, summary }: EnergyModeCardProps) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { label, Icon } = getModeAppearance(mode);

  return (
    <div
      className={`rounded-[28px] border p-5 ${surface.border} ${surface.panel}`}
      style={{
        background:
          theme === 'light'
            ? `linear-gradient(180deg, ${accentColor}12 0%, rgba(255,255,255,0.88) 40%)`
            : `linear-gradient(180deg, ${accentColor}18 0%, transparent 36%)`,
      }}
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <div
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
          >
            Current mode
          </div>
          <div className={`mt-2 text-2xl font-semibold tracking-tight ${surface.textPrimary}`}>
            {label}
          </div>
        </div>
        <div className={`rounded-full border p-3 ${surface.border} ${surface.iconBg}`}>
          <Icon className="h-5 w-5" style={{ color: accentColor }} />
        </div>
      </div>
      <Text tone="muted" className="mt-3 max-w-md text-sm leading-6">
        {summary}
      </Text>
    </div>
  );
});
