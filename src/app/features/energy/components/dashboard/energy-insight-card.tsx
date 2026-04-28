import { AlertTriangle, Info, Siren } from 'lucide-react';
import { memo } from 'react';
import { Text } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import type { EnergyInsight, EnergyWhatChanged } from '../../types/energy.types';

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

function getSeverityColor(
  severity: EnergyInsightCardProps['severity'],
  theme: ReturnType<typeof useTheme>['theme']
) {
  if (severity === 'critical') {
    return theme === 'light' ? 'text-red-600' : 'text-red-300';
  }

  if (severity === 'warning') {
    return theme === 'light' ? 'text-orange-600' : 'text-orange-300';
  }

  return theme === 'light' ? 'text-sky-700' : 'text-sky-300';
}

export const EnergyInsightCard = memo(function EnergyInsightCard({
  title,
  description,
  severity,
}: EnergyInsightCardProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const Icon = getSeverityIcon(severity);
  const severityColor = getSeverityColor(severity, theme);

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
