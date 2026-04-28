import { Settings2 } from 'lucide-react';
import { memo } from 'react';
import { useShallow } from 'zustand/react/shallow';
import { Button, TabList, Tabs, TabTrigger, Text } from '@/app/components/primitives';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useMediaQuery, useTheme } from '@/app/hooks';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { EnergyDashboardModel, EnergyRange } from '../../types/energy.types';
import { shouldUseStaticEnergyBeams } from '../../utils/build-energy-dashboard-model';
import { EnergyBreakdownChart } from './energy-breakdown-chart';
import { EnergyFlowMap } from './energy-flow-map';
import { EnergyInsightCard, mapEnergyInsightToCard } from './energy-insight-card';
import { EnergyMetricCard } from './energy-metric-card';
import { EnergyModeCard } from './energy-mode-card';
import { LiveConsumptionChart } from './live-consumption-chart';
import { TopConsumersList } from './top-consumers-list';

interface EnergyDashboardPageProps {
  dashboard: EnergyDashboardModel;
  range: EnergyRange;
  onRangeChange: (range: EnergyRange) => void;
  selectedNodeId: EnergyDashboardModel['nodes'][number]['id'] | null;
  onNodeSelect: (nodeId: EnergyDashboardModel['nodes'][number]['id']) => void;
  onOpenSetup: () => void;
}

const rangeOptions: EnergyRange[] = ['now', 'today', 'week', 'month'];

export const EnergyDashboardPage = memo(function EnergyDashboardPage({
  dashboard,
  range,
  onRangeChange,
  selectedNodeId,
  onNodeSelect,
  onOpenSetup,
}: EnergyDashboardPageProps) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { disableAnimations, lowPowerMode, effectsQuality } = useSettingsStore(
    useShallow(settingsSelectors.displaySettings)
  );
  const prefersReducedMotion = useMediaQuery('(prefers-reduced-motion: reduce)');
  const selectedRange = dashboard.ranges[range];
  const staticBeams = shouldUseStaticEnergyBeams({
    disableAnimations,
    lowPowerMode,
    effectsQuality,
    prefersReducedMotion,
  });

  return (
    <div className="space-y-6">
      <section
        className={`rounded-[32px] border p-5 md:p-6 ${surface.border} ${surface.panel} ${surface.cardShadow}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              Energy Dashboard
            </div>
            <h1
              className={`mt-3 text-2xl font-semibold tracking-tight md:text-4xl ${surface.textPrimary}`}
            >
              Read the house in one glance.
            </h1>
            <Text tone="muted" className="mt-3 max-w-2xl text-sm leading-6 md:text-base">
              Live load, where it comes from, what the battery is doing, and what changed versus the
              previous window.
            </Text>
          </div>

          <Button
            variant="secondary"
            size="small"
            leading={<Settings2 className="h-4 w-4" />}
            onClick={onOpenSetup}
          >
            Reconfigure
          </Button>
        </div>

        <div className="mt-6 grid gap-4 xl:grid-cols-[minmax(0,1.1fr)_minmax(0,1.5fr)]">
          <EnergyModeCard mode={dashboard.mode} summary={dashboard.modeSummary} />
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {dashboard.summary.map((metric) => (
              <EnergyMetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        </div>
      </section>

      <section className="grid gap-6 xl:grid-cols-[minmax(0,1.45fr)_minmax(22rem,0.9fr)]">
        <EnergyFlowMap
          nodes={dashboard.nodes}
          flows={dashboard.flows}
          consumers={dashboard.topConsumers}
          selectedNodeId={selectedNodeId}
          onNodeSelect={onNodeSelect}
          staticBeams={staticBeams}
        />

        <div className="grid gap-6">
          <LiveConsumptionChart
            title="Live consumption"
            eyebrow="Current load"
            snapshot={selectedRange}
            accentColor={accentColor}
          />
          <EnergyInsightCard {...mapEnergyInsightToCard(dashboard.whatChanged)} />
        </div>
      </section>

      <section className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
        <EnergyMetricCard
          metric={{
            id: 'today-usage',
            label: 'Today total',
            value: selectedRange.totalUsageKWh.toFixed(1),
            caption: 'kWh used',
          }}
        />
        <EnergyMetricCard
          metric={{
            id: 'today-solar',
            label: 'Solar today',
            value: selectedRange.solarProductionKWh.toFixed(1),
            caption: 'kWh produced',
            tone: 'good',
          }}
        />
        <EnergyMetricCard
          metric={{
            id: 'today-grid',
            label: 'Grid today',
            value: `${selectedRange.gridImportKWh.toFixed(1)} / ${selectedRange.gridExportKWh.toFixed(1)}`,
            caption: 'import / export kWh',
          }}
        />
        <EnergyMetricCard
          metric={{
            id: 'today-cost',
            label: 'Estimated cost',
            value: selectedRange.estimatedCost.toFixed(2),
            caption: 'today',
            tone: selectedRange.estimatedCost > 12 ? 'warn' : 'default',
          }}
        />
      </section>

      <section
        className={`rounded-[32px] border p-5 md:p-6 ${surface.border} ${surface.panel} ${surface.cardShadow}`}
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <div
              className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
            >
              Detail
            </div>
            <h2 className={`mt-2 text-xl font-semibold tracking-tight ${surface.textPrimary}`}>
              Energy breakdown, cost, and device impact
            </h2>
          </div>
          <Tabs
            value={range}
            defaultValue={range}
            onValueChange={(value) => onRangeChange(value as EnergyRange)}
          >
            <TabList variant="segmented" size="compact">
              {rangeOptions.map((option) => (
                <TabTrigger key={option} value={option} size="compact">
                  {option === 'now'
                    ? 'Now'
                    : option === 'today'
                      ? 'Today'
                      : option === 'week'
                        ? 'Week'
                        : 'Month'}
                </TabTrigger>
              ))}
            </TabList>
          </Tabs>
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-2">
          <EnergyBreakdownChart
            title="Energy breakdown"
            eyebrow="Sources"
            items={selectedRange.energyBreakdown}
            accentColor={accentColor}
          />
          <EnergyBreakdownChart
            title="Cost breakdown"
            eyebrow="Spend"
            items={selectedRange.costBreakdown}
            accentColor={accentColor}
          />
        </div>

        <div className="mt-6 grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(0,0.8fr)]">
          <TopConsumersList
            title="Top consumers"
            eyebrow="Device-level"
            consumers={dashboard.topConsumers.slice(0, 6)}
          />
          <div className="grid gap-4">
            <EnergyInsightCard {...mapEnergyInsightToCard(dashboard.whatChanged)} />
            {dashboard.insights.slice(0, 2).map((insight) => (
              <EnergyInsightCard key={insight.id} {...mapEnergyInsightToCard(insight)} />
            ))}
          </div>
        </div>
      </section>
    </div>
  );
});
