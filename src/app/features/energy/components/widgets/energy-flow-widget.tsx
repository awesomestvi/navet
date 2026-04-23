import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { FLOW_TO_NODE_ID, FLOW_TONE_ACCENT } from '../../data/energy-constants';
import type { EnergyFlowDatum } from '../../types/energy.types';
import { EnergySparkline } from '../charts/energy-sparkline';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface EnergyFlowWidgetProps {
  flow: EnergyFlowDatum[];
  onNodeSelect: (nodeId: string | null) => void;
}

export const EnergyFlowWidget = memo(function EnergyFlowWidget({
  flow,
  onNodeSelect,
}: EnergyFlowWidgetProps) {
  const { t } = useI18n();
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.flow.title')}
      eyebrow={t('energy.widgets.flow.eyebrow')}
    >
      <div className="grid gap-3 lg:grid-cols-3">
        {flow.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => onNodeSelect(FLOW_TO_NODE_ID[item.id] ?? null)}
            className={`rounded-3xl border p-4 text-left transition-colors ${surface.border} ${surface.panelMuted} ${surface.hoverBg}`}
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <div
                  className={`text-xs font-semibold uppercase tracking-[0.14em] ${surface.textMuted}`}
                >
                  {item.direction === 'sink'
                    ? t('energy.widgets.flow.direction.usage')
                    : item.direction === 'storage'
                      ? t('energy.widgets.flow.direction.storage')
                      : t('energy.widgets.flow.direction.supply')}
                </div>
                <div className={`mt-2 text-base font-semibold ${surface.textPrimary}`}>
                  {item.label}
                </div>
              </div>
              <span
                className={`rounded-full border px-2.5 py-1 text-xs font-medium ${surface.border} ${surface.textSecondary}`}
              >
                {item.direction === 'sink'
                  ? t('energy.widgets.flow.directionLabel.sink')
                  : item.direction === 'storage'
                    ? t('energy.widgets.flow.directionLabel.storage')
                    : t('energy.widgets.flow.directionLabel.source')}
              </span>
            </div>

            <div className="mt-4">
              <EnergySparkline
                data={[
                  { value: item.value * 0.72 },
                  { value: item.value * 0.81 },
                  { value: item.value * 0.76 },
                  { value: item.value * 0.92 },
                  { value: item.value },
                ]}
                accentColor={FLOW_TONE_ACCENT[item.tone]}
                height={52}
              />
            </div>

            <div className={`mt-3 text-2xl font-semibold ${surface.textPrimary}`}>
              {item.value.toFixed(1)} kW
            </div>
            <div className={`mt-1 text-xs ${surface.textSecondary}`}>
              {item.direction === 'sink'
                ? t('energy.widgets.flow.branchDemand')
                : item.direction === 'storage'
                  ? t('energy.widgets.flow.branchBuffer')
                  : t('energy.widgets.flow.branchSupply')}
            </div>
          </button>
        ))}
      </div>
    </EnergyWidgetShell>
  );
});
