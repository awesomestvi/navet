import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import type { EnergyNode } from '../../types/energy.types';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyDrilldownWidgetProps {
  node: EnergyNode | null;
}

export const EnergyDrilldownWidget = memo(function EnergyDrilldownWidget({
  node,
}: EnergyDrilldownWidgetProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.drilldown.title')}
      eyebrow={t('energy.widgets.drilldown.eyebrow')}
    >
      {node ? (
        <div className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}>
          <div className={`text-xs uppercase tracking-[0.16em] ${surface.textMuted}`}>
            {node.kind}
          </div>
          <div className={`mt-2 text-lg font-semibold ${surface.textPrimary}`}>{node.name}</div>
          <div className={`mt-2 text-sm ${surface.textSecondary}`}>
            {t('energy.widgets.drilldown.resource')}: {node.resourceType.replace('_', ' ')}
            {node.room ? ` • ${node.room}` : ''}
            {node.system ? ` • ${node.system}` : ''}
          </div>
          <div className="mt-4 flex flex-wrap gap-2">
            {node.entityIds.map((entityId) => (
              <span
                key={entityId}
                className={`rounded-full border px-3 py-1.5 text-xs ${surface.border} ${surface.textSecondary}`}
              >
                {entityId}
              </span>
            ))}
          </div>
        </div>
      ) : null}
    </EnergyWidgetShell>
  );
});
