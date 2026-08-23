import { CardDialogSection } from '@navet/app/components/patterns';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { ChevronDown, ChevronUp } from 'lucide-react';
import type { EnergyUsageMetric } from './energy-detailed-history-workspace';

interface EnergyKpiOrderEditorProps {
  metrics: EnergyUsageMetric[];
  onOrderChange: (metricIds: string[]) => void;
  orderedMetricIds: string[];
}

export function EnergyKpiOrderEditor({
  metrics,
  onOrderChange,
  orderedMetricIds,
}: EnergyKpiOrderEditorProps) {
  const moveMetric = (currentIndex: number, nextIndex: number) => {
    if (nextIndex < 0 || nextIndex >= orderedMetricIds.length) return;
    const nextIds = [...orderedMetricIds];
    const [metricId] = nextIds.splice(currentIndex, 1);
    if (!metricId) return;
    nextIds.splice(nextIndex, 0, metricId);
    onOrderChange(nextIds);
  };

  return (
    <CardDialogSection>
      <div className="grid gap-1.5">
        {metrics.map((metric, index) => (
          <EnergyKpiOrderRow
            key={metric.id}
            metric={metric}
            canMoveUp={index > 0}
            canMoveDown={index < metrics.length - 1}
            onMoveUp={() => moveMetric(index, index - 1)}
            onMoveDown={() => moveMetric(index, index + 1)}
          />
        ))}
      </div>
    </CardDialogSection>
  );
}

function EnergyKpiOrderRow({
  canMoveDown,
  canMoveUp,
  metric,
  onMoveDown,
  onMoveUp,
}: {
  canMoveDown: boolean;
  canMoveUp: boolean;
  metric: EnergyUsageMetric;
  onMoveDown: () => void;
  onMoveUp: () => void;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      className={cn(
        'flex min-h-12 items-center gap-3 rounded-2xl border px-2.5 py-2',
        surface.border,
        surface.subtleBg
      )}
    >
      <EntityCardHeaderIcon
        IconComponent={metric.icon}
        isActive={false}
        size="small"
        baseColor={metric.color}
      />
      <span className="min-w-0 flex-1">
        <span className={`block truncate text-sm font-semibold ${surface.textPrimary}`}>
          {metric.label}
        </span>
        <span className={`block truncate text-xs ${surface.textSecondary}`}>{metric.detail}</span>
      </span>
      <span className={`shrink-0 text-sm font-semibold ${surface.textPrimary}`}>
        {metric.value}
      </span>
      <span className="flex shrink-0 items-center gap-1">
        <button
          type="button"
          aria-label={`Move ${metric.label} earlier`}
          disabled={!canMoveUp}
          onClick={onMoveUp}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-35',
            surface.hoverBg,
            surface.textMuted
          )}
        >
          <ChevronUp className="h-4 w-4" aria-hidden="true" />
        </button>
        <button
          type="button"
          aria-label={`Move ${metric.label} later`}
          disabled={!canMoveDown}
          onClick={onMoveDown}
          className={cn(
            'flex h-8 w-8 items-center justify-center rounded-xl disabled:cursor-not-allowed disabled:opacity-35',
            surface.hoverBg,
            surface.textMuted
          )}
        >
          <ChevronDown className="h-4 w-4" aria-hidden="true" />
        </button>
      </span>
    </div>
  );
}
