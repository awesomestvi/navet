import { Text } from '@navet/app/components/primitives';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { EnergyDashboardMode } from '@navet/app/features/energy/types/energy.types';
import { useI18n, useTheme } from '@navet/app/hooks';
import type { TranslateFn } from '@navet/app/i18n';
import { BatteryCharging, Gauge, Leaf, Zap } from 'lucide-react';
import { memo } from 'react';

interface EnergyModeCardProps {
  mode: EnergyDashboardMode;
  summary: string;
}

function getModeAppearance(mode: EnergyDashboardMode, t: TranslateFn) {
  switch (mode) {
    case 'eco':
      return {
        label: t('energy.dashboard.mode.eco'),
        Icon: Leaf,
      };
    case 'peak':
      return {
        label: t('energy.dashboard.mode.peak'),
        Icon: Zap,
      };
    case 'battery_saver':
      return {
        label: t('energy.dashboard.mode.batterySaver'),
        Icon: BatteryCharging,
      };
    default:
      return {
        label: t('energy.dashboard.mode.normal'),
        Icon: Gauge,
      };
  }
}

export const EnergyModeCard = memo(function EnergyModeCard({ mode, summary }: EnergyModeCardProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const { label, Icon } = getModeAppearance(mode, t);

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
            {t('energy.dashboard.mode.current')}
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
