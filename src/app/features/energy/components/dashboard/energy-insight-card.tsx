import { AlertTriangle, Info, Siren } from 'lucide-react';
import { memo } from 'react';
import { Text } from '@/app/components/primitives';
import { getEnergyInsightSurfaceTokens } from '@/app/components/shared/theme/energy-widget-surface-tokens';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import type { EnergyInsight, EnergyWhatChanged } from '@/app/features/energy/types/energy.types';
import { useTheme } from '@/app/hooks';

interface EnergyInsightCardProps {
  title: string;
  description: string;
  severity: 'info' | 'warning' | 'critical' | 'default';
}

function getSeverityIcon(severity: EnergyInsightCardProps['severity']) {
  if (severity === 'critical') {
    return Siren;
  }

  if (severity === 'warning') {
    return AlertTriangle;
  }

  return Info;
}

export const EnergyInsightCard = memo(function EnergyInsightCard({
  title,
  description,
  severity,
}: EnergyInsightCardProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const insightSurface = getEnergyInsightSurfaceTokens(theme);
  const Icon = getSeverityIcon(severity);
  const severityColor =
    severity === 'critical'
      ? insightSurface.criticalColor
      : severity === 'warning'
        ? insightSurface.warningColor
        : insightSurface.infoColor;

  return (
    <div className={`rounded-[24px] border p-4 ${surface.border} ${surface.panelMuted}`}>
      <div className="flex items-start gap-3">
        <div className={`rounded-full border p-2 ${surface.border} ${surface.iconBg}`}>
          <Icon className={`h-4 w-4 ${severityColor}`} />
        </div>
        <div className="min-w-0">
          <div className={`text-sm font-semibold ${surface.textPrimary}`}>{title}</div>
          <Text tone="muted" className="mt-1 text-sm leading-6">
            {description}
          </Text>
        </div>
      </div>
    </div>
  );
});

export function mapEnergyInsightToCard(
  insight: EnergyInsight | EnergyWhatChanged
): EnergyInsightCardProps {
  if ('severity' in insight) {
    return {
      title: insight.title,
      description: insight.description,
      severity: insight.severity,
    };
  }

  return {
    title: insight.title,
    description: insight.description,
    severity: insight.tone === 'warn' ? 'warning' : insight.tone === 'good' ? 'info' : 'default',
  };
}
