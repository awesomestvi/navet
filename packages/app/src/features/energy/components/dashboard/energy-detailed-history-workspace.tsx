import { CardDialogSection, NavigationWorkspace } from '@navet/app/components/patterns';
import {
  BaseCard,
  BaseCardDialog,
  Button,
  InteractivePill,
  OverlayScrollArea,
  SheetSurfaceHeader,
} from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { withTintAlpha } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { STORAGE_KEYS } from '@navet/app/constants/storage-keys';
import { useEnergyHistoryWorkspace } from '@navet/app/features/energy/hooks/use-energy-history-workspace';
import { useProviderEnergyKpiMetrics } from '@navet/app/features/energy/hooks/use-provider-energy-kpi-metrics';
import type {
  EnergyConsumer,
  EnergyDashboardModel,
  EnergyHistoryBucket,
  EnergyHistoryContribution,
  EnergyHistoryRange,
  EnergyHistorySource,
  EnergyHistoryWindow,
  EnergyProviderKpiMetric,
  EnergySeriesPoint,
} from '@navet/app/features/energy/types/energy.types';
import { formatEnergyValue } from '@navet/app/features/energy/utils/energy-formatters';
import {
  useI18n,
  useIntegrationStore,
  useMediaQuery,
  usePersistedState,
  useTheme,
} from '@navet/app/hooks';
import type {
  PlatformStatisticsHistoryRequest,
  PlatformStatisticsHistorySeries,
} from '@navet/app/platform/provider-feature-models';
import { integrationSelectors } from '@navet/app/stores/selectors';
import {
  ArrowLeft,
  BatteryCharging,
  Check,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  Gauge,
  GripVertical,
  type LucideIcon,
  SlidersHorizontal,
  SunMedium,
  TrendingDown,
  TrendingUp,
  UtilityPole,
  WalletCards,
  Zap,
} from 'lucide-react';
import { type CSSProperties, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { EnergyHistoryBarChart } from '../charts/energy-history-bar-chart';
import { EnergySparkline } from '../charts/energy-sparkline';

type EnergyUsageRange = 'live' | EnergyHistoryRange;

function EnergyLoadingIndicator() {
  return (
    <div
      role="status"
      className="flex items-center justify-center"
      aria-label="Loading energy data"
    >
      <span
        aria-hidden="true"
        className="h-5 w-5 animate-spin rounded-full border-2 border-current border-r-transparent opacity-60"
      />
    </div>
  );
}

export interface EnergyUsageMetric {
  id: string;
  label: string;
  period: string;
  value: string;
  detail: string;
  footer: string;
  icon: LucideIcon;
  color: string;
}

interface EnergyKpiPreference {
  mode: 'auto' | 'custom';
  metricIds: string[];
}

type EnergyKpiEditorSection = 'automatic' | 'selection' | 'order';

interface EnergyKpiPreferences {
  version: 1;
  byProvider: Record<string, EnergyKpiPreference>;
}

const DEFAULT_ENERGY_KPI_PREFERENCES: EnergyKpiPreferences = {
  version: 1,
  byProvider: {},
};

const EnergyKpiOrderEditor = lazy(async () => {
  const module = await import('./energy-kpi-order-editor');
  return { default: module.EnergyKpiOrderEditor };
});

const RANGE_LABELS: Record<EnergyUsageRange, string> = {
  live: 'Live',
  today: 'Day',
  week: 'Week',
  month: 'Month',
  year: 'Year',
  custom: 'Custom',
};
const EMPTY_HISTORY_SOURCES: EnergyHistorySource[] = [];
const EMPTY_HISTORY_CONSUMERS: EnergyConsumer[] = [];

export function EnergyDetailedHistoryWorkspace({
  currentLoadStatisticId,
  accentColor,
  currentLoadW,
  livePoints,
  consumers = EMPTY_HISTORY_CONSUMERS,
  priorityData,
  insightsRange,
  customStart,
  customEnd,
  referenceDateMs,
  onReferenceDateChange,
  mainCardStyle,
  metricRowSpan,
  useBentoLayout = false,
  statisticsLoader,
  sources = EMPTY_HISTORY_SOURCES,
  isKpiCustomizationOpen = false,
  onKpiCustomizationOpenChange,
}: {
  currentLoadStatisticId?: string;
  accentColor: string;
  currentLoadW: number;
  livePoints: EnergySeriesPoint[];
  consumers?: EnergyConsumer[];
  priorityData?: Pick<EnergyDashboardModel, 'dataCoverage' | 'totals'>;
  insightsRange: EnergyHistoryRange;
  customStart: string;
  customEnd: string;
  referenceDateMs: number;
  onReferenceDateChange: (timestampMs: number) => void;
  mainCardStyle?: CSSProperties;
  metricRowSpan?: number;
  useBentoLayout?: boolean;
  statisticsLoader?: (
    request: PlatformStatisticsHistoryRequest
  ) => Promise<PlatformStatisticsHistorySeries | null>;
  sources?: EnergyHistorySource[];
  isKpiCustomizationOpen?: boolean;
  onKpiCustomizationOpenChange?: (open: boolean) => void;
}) {
  const { theme } = useTheme();
  const { locale } = useI18n();
  const isPhone = useMediaQuery('(max-width: 639px)');
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const providerKpiMetrics = useProviderEnergyKpiMetrics();
  const [kpiPreferences, setKpiPreferences] = usePersistedState<EnergyKpiPreferences>(
    STORAGE_KEYS.energyKpiPreferences,
    DEFAULT_ENERGY_KPI_PREFERENCES
  );
  const surface = getThemeSurfaceTokens(theme);
  const [chartMode, setChartMode] = useState<'live' | 'insights'>(
    insightsRange === 'today' ? 'live' : 'insights'
  );
  const [selectedSourceId, setSelectedSourceId] = useState<EnergyHistorySource['id']>('home');
  const [selectedBucketIndex, setSelectedBucketIndex] = useState<number | null>(null);
  const previousInsightsRange = useRef(insightsRange);
  useEffect(() => {
    if (previousInsightsRange.current === insightsRange) return;
    previousInsightsRange.current = insightsRange;
    setChartMode('insights');
    setSelectedBucketIndex(null);
  }, [insightsRange]);
  const availableSources = useMemo(() => {
    const candidates =
      sources.length > 0
        ? sources
        : currentLoadStatisticId
          ? [
              {
                id: 'home' as const,
                label: 'Home use',
                entityId: currentLoadStatisticId,
                color: accentColor,
                valueKind: 'power' as const,
              },
            ]
          : [];
    const seenEntityIds = new Set<string>();
    return candidates.filter((source) => {
      if (seenEntityIds.has(source.entityId)) return false;
      seenEntityIds.add(source.entityId);
      return true;
    });
  }, [accentColor, currentLoadStatisticId, sources]);
  const selectedSource =
    availableSources.find((source) => source.id === selectedSourceId) ?? availableSources[0];
  const selectedSourceColor =
    selectedSource?.id === 'home' ? accentColor : (selectedSource?.color ?? accentColor);
  const shouldShowSourceSelector =
    availableSources.length > 1 &&
    (availableSources.some((source) => source.id === 'solar') ||
      Boolean(priorityData?.dataCoverage.hasBattery || priorityData?.dataCoverage.hasGridExport));
  const isLiveChart = chartMode === 'live';
  const historyRange = insightsRange;
  const { model, window, isLoading, isBreakdownLoading, error } = useEnergyHistoryWorkspace({
    currentLoadStatisticId: selectedSource?.entityId,
    consumers: selectedSource?.id === 'home' ? consumers : EMPTY_HISTORY_CONSUMERS,
    range: historyRange,
    customStart,
    customEnd,
    referenceDateMs,
    selectedBucketIndex,
    enabled: Boolean(selectedSource?.entityId),
    statisticsLoader,
    valueKind: selectedSource?.valueKind,
  });
  const chartData =
    model?.buckets.map((bucket) => ({
      label: bucket.label,
      value: bucket.averagePowerW,
      secondaryValue: bucket.energyKWh,
      hasData: bucket.hasData,
      timestampMs: bucket.startMs,
      endTimestampMs: bucket.endMs,
      minValue: bucket.lowPowerW,
      maxValue: bucket.peakPowerW,
    })) ?? [];
  const detailLabel = `${RANGE_LABELS[historyRange]} total`;
  const metricEnergyKWh = model?.totalEnergyKWh ?? 0;
  const metricLowPowerW = model?.lowPowerW ?? 0;
  const metricAveragePowerW = model?.averagePowerW ?? 0;
  const metricPeakPowerW = model?.peakPowerW ?? 0;
  const observedEnergyBuckets = model?.buckets.filter((bucket) => bucket.hasData) ?? [];
  const lowestEnergyBucket = findLowestEnergyBucket(observedEnergyBuckets);
  const highestEnergyBucket = findHighestEnergyBucket(observedEnergyBuckets);
  const averageBucketEnergyKWh =
    observedEnergyBuckets.length > 0
      ? (model?.totalEnergyKWh ?? 0) / observedEnergyBuckets.length
      : 0;
  const energyBucketUnit = getEnergyBucketUnit(observedEnergyBuckets[0]);
  const energyBucketAverageLabel = `the ${energyBucketUnit} average`;
  const liveLowPowerW = livePoints.reduce(
    (lowest, point) => Math.min(lowest, point.minValue ?? point.value),
    Number.POSITIVE_INFINITY
  );
  const liveAveragePowerW =
    livePoints.length > 0
      ? livePoints.reduce((total, point) => total + point.value, 0) / livePoints.length
      : 0;
  const livePeakPowerW = livePoints.reduce(
    (highest, point) => Math.max(highest, point.maxValue ?? point.value),
    0
  );
  const liveTickIndexes = new Set([
    0,
    Math.floor((livePoints.length - 1) / 3),
    Math.floor(((livePoints.length - 1) * 2) / 3),
    livePoints.length - 1,
  ]);
  const isTodayInsights = historyRange === 'today';
  const displayedLowPowerW = isTodayInsights
    ? (model?.lowPowerW ?? (Number.isFinite(liveLowPowerW) ? liveLowPowerW : 0))
    : metricLowPowerW;
  const displayedAveragePowerW = isTodayInsights
    ? (model?.averagePowerW ?? liveAveragePowerW)
    : metricAveragePowerW;
  const displayedPeakPowerW = isTodayInsights
    ? (model?.peakPowerW ?? livePeakPowerW)
    : metricPeakPowerW;
  const displayedEnergyKWh = model?.totalEnergyKWh;
  const lowPowerBucket = findLowestPowerBucket(model?.buckets ?? []);
  const energyComparison = model
    ? formatEnergyComparison(model.comparisonPercent, isTodayInsights)
    : isLoading
      ? 'Loading previous-period comparison…'
      : 'Previous-period comparison unavailable';
  const periodLabel = RANGE_LABELS[historyRange];
  const historyPeriodContext = formatHistoryPeriodContext(historyRange, window, locale);
  const historyNavigationUnit = getHistoryNavigationUnit(historyRange);
  const isCurrentHistoryPeriod = isSameHistoryPeriod(historyRange, referenceDateMs, Date.now());
  const periodAverageLabel = isTodayInsights ? "today's average" : 'the period average';
  const metricCardSpans = resolveMetricCardSpans(metricRowSpan);
  const genericLiveMetrics: EnergyUsageMetric[] = [
    {
      id: 'now',
      label: 'Current demand',
      period: 'Live',
      value: formatPowerValue(currentLoadW),
      detail: 'Household load right now',
      footer: energyComparison,
      icon: Zap,
      color: selectedSourceColor,
    },
    {
      id: 'low',
      label: 'Low usage',
      period: periodLabel,
      value: model || livePoints.length > 0 ? formatPowerValue(displayedLowPowerW) : '—',
      detail: lowPowerBucket
        ? formatLowestOccurrence(lowPowerBucket.startMs, lowPowerBucket.endMs)
        : 'Today so far',
      footer: formatRelativeToAverage(
        displayedLowPowerW,
        displayedAveragePowerW,
        'below',
        periodAverageLabel
      ),
      icon: TrendingDown,
      color: '#38bdf8',
    },
    {
      id: 'average',
      label: 'Average usage',
      period: periodLabel,
      value: model || livePoints.length > 0 ? formatPowerValue(displayedAveragePowerW) : '—',
      detail: 'Typical demand so far',
      footer:
        typeof displayedEnergyKWh === 'number'
          ? `${formatEnergyValue(displayedEnergyKWh)} kWh used today`
          : 'Historical context is loading…',
      icon: Gauge,
      color: '#2dd4bf',
    },
    {
      id: 'peak',
      label: 'Peak usage',
      period: periodLabel,
      value: model || livePoints.length > 0 ? formatPowerValue(displayedPeakPowerW) : '—',
      detail:
        model?.peakStartMs && model.peakEndMs
          ? formatPeakOccurrence(model.peakStartMs, model.peakEndMs)
          : 'Highest demand so far',
      footer: formatRelativeToAverage(
        displayedPeakPowerW,
        displayedAveragePowerW,
        'above',
        periodAverageLabel
      ),
      icon: TrendingUp,
      color: '#fb923c',
    },
  ];
  const capabilityMetrics: EnergyUsageMetric[] = [];
  if (priorityData?.dataCoverage.hasGridImport || priorityData?.dataCoverage.hasGridExport) {
    const isExporting = (priorityData?.totals.exportW ?? 0) > 0;
    const gridPowerW = isExporting
      ? (priorityData?.totals.exportW ?? 0)
      : (priorityData?.totals.importW ?? 0);
    const gridEnergyKWh = isExporting
      ? (priorityData?.totals.exportTodayKWh ?? 0)
      : (priorityData?.totals.importTodayKWh ?? 0);
    capabilityMetrics.push({
      id: 'grid',
      label: isExporting ? 'Grid export' : 'Grid import',
      period: 'Live',
      value: formatPowerValue(gridPowerW),
      detail:
        gridPowerW > 0
          ? `${isExporting ? 'Exporting' : 'Importing'} right now`
          : 'No grid flow right now',
      footer: `${formatEnergyValue(gridEnergyKWh)} kWh ${isExporting ? 'exported' : 'imported'} today`,
      icon: UtilityPole,
      color: '#60a5fa',
    });
  }
  if (priorityData?.dataCoverage.hasSolar) {
    const solarCoverage =
      currentLoadW > 0
        ? Math.min(100, Math.round((priorityData.totals.solarW / currentLoadW) * 100))
        : 0;
    capabilityMetrics.push({
      id: 'solar',
      label: 'Solar production',
      period: 'Live',
      value: formatPowerValue(priorityData.totals.solarW),
      detail:
        priorityData.totals.solarW > 0 ? 'Generating right now' : 'Configured · not producing',
      footer:
        priorityData.totals.solarW > 0
          ? `${solarCoverage}% of current demand`
          : `${formatEnergyValue(priorityData.totals.solarTodayKWh)} kWh generated today`,
      icon: SunMedium,
      color: '#facc15',
    });
  }
  if (priorityData?.dataCoverage.hasBattery) {
    const batteryPowerW = priorityData.totals.batteryPowerW;
    capabilityMetrics.push({
      id: 'battery',
      label: 'Battery',
      period: 'Live',
      value: `${Math.round(priorityData.totals.batteryPercent)}%`,
      detail:
        batteryPowerW > 0
          ? `Charging at ${formatPowerValue(batteryPowerW)}`
          : batteryPowerW < 0
            ? `Supplying ${formatPowerValue(Math.abs(batteryPowerW))}`
            : 'Idle right now',
      footer:
        priorityData.totals.batteryPercent <= 20
          ? 'Battery reserve is low'
          : 'Stored energy is available',
      icon: BatteryCharging,
      color: '#2dd4bf',
    });
  }
  if (priorityData?.dataCoverage.hasCost) {
    capabilityMetrics.push({
      id: 'cost',
      label: 'Energy cost',
      period: 'Today',
      value: formatEnergyValue(priorityData.totals.costToday),
      detail: 'Recorded cost so far',
      footer:
        priorityData.totals.projectedMonthCost > 0
          ? `${formatEnergyValue(priorityData.totals.projectedMonthCost)} projected this month`
          : 'Monthly projection unavailable',
      icon: CircleDollarSign,
      color: '#a78bfa',
    });
  }
  const rangeMetrics: EnergyUsageMetric[] = [
    {
      id: 'energy',
      label: 'Energy used',
      period: periodLabel,
      value: model ? `${formatEnergyValue(metricEnergyKWh)} kWh` : '—',
      detail: detailLabel,
      footer: energyComparison,
      icon: Gauge,
      color: selectedSourceColor,
    },
    {
      id: 'low',
      label: 'Low usage',
      period: periodLabel,
      value: lowestEnergyBucket ? `${formatEnergyValue(lowestEnergyBucket.energyKWh)} kWh` : '—',
      detail: lowestEnergyBucket
        ? formatLowestOccurrence(lowestEnergyBucket.startMs, lowestEnergyBucket.endMs)
        : detailLabel,
      footer: formatRelativeToAverage(
        lowestEnergyBucket?.energyKWh ?? 0,
        averageBucketEnergyKWh,
        'below',
        energyBucketAverageLabel
      ),
      icon: TrendingDown,
      color: '#38bdf8',
    },
    {
      id: 'average',
      label: 'Average usage',
      period: periodLabel,
      value: model ? `${formatEnergyValue(averageBucketEnergyKWh)} kWh` : '—',
      detail: `${capitalizeFirst(energyBucketUnit)} average`,
      footer: model
        ? `${formatEnergyValue(model.totalEnergyKWh)} kWh across ${formatBucketCount(observedEnergyBuckets.length, energyBucketUnit)}`
        : 'Historical context is loading…',
      icon: Gauge,
      color: '#2dd4bf',
    },
    {
      id: 'peak',
      label: 'Peak usage',
      period: periodLabel,
      value: highestEnergyBucket ? `${formatEnergyValue(highestEnergyBucket.energyKWh)} kWh` : '—',
      detail: highestEnergyBucket
        ? formatPeakOccurrence(highestEnergyBucket.startMs, highestEnergyBucket.endMs)
        : detailLabel,
      footer: formatRelativeToAverage(
        highestEnergyBucket?.energyKWh ?? 0,
        averageBucketEnergyKWh,
        'above',
        energyBucketAverageLabel
      ),
      icon: TrendingUp,
      color: '#fb923c',
    },
  ];
  const providerUsageMetrics = providerKpiMetrics.map(toProviderUsageMetric);
  const automaticProviderMetrics = providerKpiMetrics
    .filter((metric) => metric.kind === 'prepaid')
    .map(toProviderUsageMetric);
  const selectableUsageMetrics = uniqueUsageMetrics([
    ...providerUsageMetrics,
    ...capabilityMetrics,
    ...genericLiveMetrics,
    ...rangeMetrics,
  ]);
  const automaticUsageMetrics = uniqueUsageMetrics(
    isLiveChart
      ? [
          ...automaticProviderMetrics,
          ...(capabilityMetrics.length > 0
            ? [...capabilityMetrics, ...genericLiveMetrics.slice(1), genericLiveMetrics[0]]
            : genericLiveMetrics),
        ]
      : [...automaticProviderMetrics, ...rangeMetrics]
  ).slice(0, 4);
  const currentKpiPreference = normalizeEnergyKpiPreference(
    kpiPreferences.byProvider[currentProviderId]
  );
  const usageMetrics =
    currentKpiPreference.mode === 'custom'
      ? resolveSelectedUsageMetrics(currentKpiPreference.metricIds, selectableUsageMetrics)
      : automaticUsageMetrics;
  const updateKpiPreference = (nextPreference: EnergyKpiPreference) => {
    setKpiPreferences((current) => ({
      version: 1,
      byProvider: {
        ...(current?.version === 1 ? current.byProvider : {}),
        [currentProviderId]: nextPreference,
      },
    }));
  };
  const detailCardClassName = useBentoLayout ? 'order-10 col-span-4 row-span-2 min-w-0' : 'min-w-0';
  const selectedBucket = isLiveChart ? null : (model?.selectedBucket ?? null);
  const selectedBucketUnit = getEnergyBucketUnit(selectedBucket ?? undefined);
  const selectedBucketCost =
    selectedBucket &&
    priorityData?.dataCoverage.hasCost &&
    priorityData.totals.costToday > 0 &&
    isSameLocalDate(selectedBucket.startMs, Date.now())
      ? priorityData.totals.costToday
      : undefined;

  return (
    <>
      <div
        className={useBentoLayout ? 'contents' : 'space-y-3'}
        data-testid="energy-history-workspace"
      >
        {useBentoLayout
          ? usageMetrics.map((metric, index) => (
              <EnergyUsageMetricCard
                key={metric.id}
                metric={metric}
                gridColumnSpan={metricCardSpans[index]}
                compactHeader={isPhone}
              />
            ))
          : null}
        <BaseCard
          size="extra-large"
          fullBleed
          surfaceVariant="muted"
          className={cn('h-full min-w-0 w-full overflow-hidden', useBentoLayout && 'row-span-4')}
          data-testid="energy-usage-card"
          data-overview-module="usage"
          style={mainCardStyle}
          title={selectedBucket ? `Selected ${selectedBucketUnit}` : 'Energy usage'}
          subtitle={
            isLiveChart
              ? 'Live power demand'
              : selectedBucket
                ? formatTimeWindow(selectedBucket.startMs, selectedBucket.endMs)
                : `${historyPeriodContext} · Select a bar to inspect that period.`
          }
          headerLayout="title-first"
          headerLeading={
            selectedBucket ? (
              <div className="flex items-start gap-1.5">
                <Button
                  iconOnly
                  label="Back to chart"
                  size="compact"
                  variant="ghost"
                  className="h-8 w-8"
                  onClick={() => setSelectedBucketIndex(null)}
                >
                  <ArrowLeft className="h-4 w-4" aria-hidden="true" />
                </Button>
                <EntityCardHeaderIcon
                  IconComponent={Gauge}
                  isActive
                  size="extra-large"
                  baseColor={selectedSourceColor}
                />
              </div>
            ) : (
              <EntityCardHeaderIcon
                IconComponent={TrendingUp}
                isActive
                size="extra-large"
                baseColor={selectedSourceColor}
              />
            )
          }
          headerTrailing={
            selectedBucket ? undefined : (
              <div
                className="flex min-w-0 flex-row items-center justify-between gap-2 sm:justify-start"
                data-testid="energy-usage-toolbar"
              >
                {!isLiveChart && historyNavigationUnit ? (
                  <fieldset className="order-2 m-0 flex min-w-0 flex-1 items-center justify-end gap-0.5 border-0 p-0 sm:order-1 sm:flex-none sm:gap-1">
                    <legend className="sr-only">Displayed {historyNavigationUnit}</legend>
                    <Button
                      iconOnly
                      label={`Previous ${historyNavigationUnit}`}
                      size="compact"
                      variant="ghost"
                      className="h-9 w-9 shrink-0"
                      onClick={() =>
                        onReferenceDateChange(
                          shiftHistoryReference(insightsRange, referenceDateMs, -1)
                        )
                      }
                    >
                      <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                    </Button>
                    <span
                      className={cn(
                        'min-w-0 flex-1 truncate px-0.5 text-center text-[11px] font-semibold tabular-nums sm:min-w-28 sm:flex-none sm:px-1 sm:text-xs',
                        surface.textPrimary
                      )}
                    >
                      {historyPeriodContext}
                    </span>
                    <Button
                      iconOnly
                      label={`Next ${historyNavigationUnit}`}
                      size="compact"
                      variant="ghost"
                      className="h-9 w-9 shrink-0"
                      disabled={isCurrentHistoryPeriod}
                      onClick={() =>
                        onReferenceDateChange(
                          shiftHistoryReference(insightsRange, referenceDateMs, 1)
                        )
                      }
                    >
                      <ChevronRight className="h-4 w-4" aria-hidden="true" />
                    </Button>
                  </fieldset>
                ) : null}
                <nav
                  className="order-1 flex shrink-0 gap-1 sm:order-2 sm:gap-1.5"
                  aria-label="Energy usage view"
                >
                  <InteractivePill
                    active={isLiveChart}
                    aria-pressed={isLiveChart}
                    size="compact"
                    className="px-2.5 sm:px-3"
                    onClick={() => {
                      setChartMode('live');
                      setSelectedBucketIndex(null);
                    }}
                  >
                    Live
                  </InteractivePill>
                  <InteractivePill
                    active={!isLiveChart}
                    aria-pressed={!isLiveChart}
                    size="compact"
                    className="px-2.5 sm:px-3"
                    onClick={() => {
                      setChartMode('insights');
                      setSelectedBucketIndex(null);
                    }}
                  >
                    {RANGE_LABELS[insightsRange]}
                  </InteractivePill>
                </nav>
              </div>
            )
          }
          headerClassName={
            selectedBucket
              ? 'px-3 pt-3'
              : 'flex-wrap px-3 pt-3 [&>div:last-child]:w-full [&>div:last-child]:basis-full lg:flex-nowrap lg:[&>div:last-child]:w-auto lg:[&>div:last-child]:basis-auto'
          }
          headerMarginBottomClassName="mb-3"
        >
          <div className="flex h-full min-h-0 flex-col">
            {!isLiveChart && !selectedBucket && shouldShowSourceSelector ? (
              <div className="scrollbar-hide flex gap-1.5 overflow-x-auto px-3 pb-3">
                {availableSources.map((source) => (
                  <InteractivePill
                    key={source.id}
                    active={selectedSource?.id === source.id}
                    aria-pressed={selectedSource?.id === source.id}
                    size="compact"
                    onClick={() => {
                      setSelectedSourceId(source.id);
                      setSelectedBucketIndex(null);
                    }}
                  >
                    {source.label}
                  </InteractivePill>
                ))}
              </div>
            ) : null}

            {isLiveChart ? (
              <>
                {!useBentoLayout ? <HistoryMetricRow metrics={usageMetrics} /> : null}
                {livePoints.length >= 2 ? (
                  <div className="relative min-h-0 flex-1">
                    <div className="absolute inset-x-0 top-2 bottom-0 overflow-visible">
                      <EnergySparkline
                        data={livePoints}
                        accentColor={selectedSourceColor}
                        height={52}
                        className="h-full w-full"
                        showYAxisMarks
                        fillOpacity={0.12}
                        padX={0}
                        strokeWidth={1}
                        valueKind="power"
                      />
                    </div>
                    <div
                      className={`pointer-events-none absolute inset-x-0 bottom-0 z-10 flex justify-between gap-3 px-3 pb-3 text-xs ${surface.textMuted}`}
                    >
                      {livePoints
                        .filter((_, index) => liveTickIndexes.has(index))
                        .map((point, index) => (
                          <span
                            key={`${point.timestampMs ?? point.label}-${index}`}
                            className="min-w-0 flex-1 truncate text-center first:text-left last:text-right"
                          >
                            {point.label}
                          </span>
                        ))}
                    </div>
                  </div>
                ) : (
                  <div
                    className={`m-3 flex min-h-32 flex-1 items-center justify-center rounded-2xl border border-dashed px-4 text-center text-sm ${surface.border} ${surface.textMuted}`}
                  >
                    Live usage history is not available yet.
                  </div>
                )}
              </>
            ) : isLoading ? (
              <div className="flex min-h-64 flex-1 items-center justify-center">
                <EnergyLoadingIndicator />
              </div>
            ) : error ? (
              <div
                className={`flex min-h-64 flex-1 items-center justify-center px-6 text-sm ${surface.textSecondary}`}
              >
                Historical statistics could not be loaded. Check the configured whole-home power
                sensor.
              </div>
            ) : !model || chartData.length === 0 ? (
              <div
                className={`flex min-h-64 flex-1 items-center justify-center px-6 text-center text-sm ${surface.textSecondary}`}
              >
                No long-term power statistics are available for this range yet.
              </div>
            ) : selectedBucket ? (
              <SelectedPeriodView
                bucket={selectedBucket}
                contributions={model.deviceBreakdown}
                untrackedEnergyKWh={model.untrackedEnergyKWh}
                isBreakdownLoading={isBreakdownLoading}
                showDeviceBreakdown={selectedSource?.id === 'home'}
                periodCost={selectedBucketCost}
              />
            ) : (
              <>
                {!useBentoLayout ? <HistoryMetricRow metrics={usageMetrics} /> : null}
                <div className="mx-3 mb-3 flex min-h-0 flex-1 flex-col pt-2">
                  <div className="min-h-0 flex-1">
                    <EnergyHistoryBarChart
                      data={chartData}
                      accentColor={selectedSourceColor}
                      ariaLabel="Energy usage by period"
                      className="h-full w-full"
                      selectionDetailsId="energy-selected-period-details"
                      selectedIndex={selectedBucketIndex}
                      onSelectedIndexChange={setSelectedBucketIndex}
                    />
                  </div>
                </div>
              </>
            )}
          </div>
        </BaseCard>

        {model && chartData.length > 0 && selectedSource?.id !== 'home' ? (
          <section
            className={cn(useBentoLayout ? 'contents' : 'grid gap-3 lg:grid-cols-2')}
            aria-label="Selected energy period details"
          >
            <BaseCard
              size="medium"
              surfaceVariant="muted"
              className={detailCardClassName}
              title={`${selectedSource?.label ?? 'Source'} summary`}
              subtitle={detailLabel}
              headerLayout="title-first"
              headerLeading={
                <EntityCardHeaderIcon
                  IconComponent={Gauge}
                  isActive
                  size="medium"
                  baseColor={selectedSourceColor}
                />
              }
            >
              <dl className="grid grid-cols-2 gap-3">
                <SourceSummaryMetric
                  label="Energy"
                  value={`${formatEnergyValue(metricEnergyKWh)} kWh`}
                />
                <SourceSummaryMetric
                  label="Average"
                  value={formatPowerValue(metricAveragePowerW)}
                />
                <SourceSummaryMetric label="Low" value={formatPowerValue(metricLowPowerW)} />
                <SourceSummaryMetric label="Peak" value={formatPowerValue(metricPeakPowerW)} />
              </dl>
            </BaseCard>
          </section>
        ) : null}
      </div>

      <EnergyKpiPicker
        isOpen={isKpiCustomizationOpen}
        onOpenChange={(open) => onKpiCustomizationOpenChange?.(open)}
        preference={currentKpiPreference}
        metrics={selectableUsageMetrics}
        automaticMetricIds={automaticUsageMetrics.map((metric) => metric.id)}
        onSave={updateKpiPreference}
      />
    </>
  );
}

function toProviderUsageMetric(metric: EnergyProviderKpiMetric): EnergyUsageMetric {
  const isUnavailable = metric.availability === 'unavailable';
  const icon =
    metric.kind === 'prepaid'
      ? WalletCards
      : metric.kind === 'cost'
        ? CircleDollarSign
        : metric.kind === 'power'
          ? Zap
          : Gauge;
  const color =
    metric.kind === 'prepaid' || metric.kind === 'cost'
      ? '#a78bfa'
      : metric.kind === 'power'
        ? '#fb923c'
        : '#2dd4bf';
  const detail =
    metric.kind === 'prepaid'
      ? 'Remaining prepaid electricity'
      : metric.kind === 'cost'
        ? 'Provider cost reading'
        : metric.kind === 'power'
          ? 'Live provider power'
          : 'Provider energy reading';

  return {
    id: metric.id,
    label: metric.label,
    period: 'Live',
    value: isUnavailable ? '—' : [metric.value, metric.unit].filter(Boolean).join(' '),
    detail: isUnavailable ? 'Provider reports this reading unavailable' : detail,
    footer: metric.room ? `Reported for ${metric.room}` : 'Reported by the active provider',
    icon,
    color,
  };
}

function uniqueUsageMetrics(metrics: EnergyUsageMetric[]) {
  const byId = new Map<string, EnergyUsageMetric>();
  metrics.forEach((metric) => {
    if (!byId.has(metric.id)) byId.set(metric.id, metric);
  });
  return [...byId.values()];
}

function normalizeEnergyKpiPreference(
  preference: EnergyKpiPreference | undefined
): EnergyKpiPreference {
  const metricIds = [...new Set(preference?.metricIds ?? [])];
  if (
    preference?.mode === 'custom' &&
    Array.isArray(preference.metricIds) &&
    metricIds.length === 4
  ) {
    return { mode: 'custom', metricIds };
  }
  return { mode: 'auto', metricIds: [] };
}

function resolveSelectedUsageMetrics(
  selectedMetricIds: string[],
  metrics: EnergyUsageMetric[]
): EnergyUsageMetric[] {
  const metricsById = new Map(metrics.map((metric) => [metric.id, metric]));
  return selectedMetricIds.map(
    (metricId) =>
      metricsById.get(metricId) ?? {
        id: metricId,
        label: 'Unavailable metric',
        period: 'Unavailable',
        value: '—',
        detail: 'This provider reading is not available',
        footer: 'Choose another KPI in Customize',
        icon: Gauge,
        color: '#94a3b8',
      }
  );
}

function EnergyKpiPicker({
  automaticMetricIds,
  isOpen,
  metrics,
  onOpenChange,
  onSave,
  preference,
}: {
  automaticMetricIds: string[];
  isOpen: boolean;
  metrics: EnergyUsageMetric[];
  onOpenChange: (open: boolean) => void;
  onSave: (preference: EnergyKpiPreference) => void;
  preference: EnergyKpiPreference;
}) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const [draftMode, setDraftMode] = useState<EnergyKpiPreference['mode']>(preference.mode);
  const [draftMetricIds, setDraftMetricIds] = useState<string[]>(preference.metricIds);
  const [activeSection, setActiveSection] = useState<EnergyKpiEditorSection>(
    preference.mode === 'custom' ? 'selection' : 'automatic'
  );
  const wasOpenRef = useRef(false);

  useEffect(() => {
    if (isOpen && !wasOpenRef.current) {
      setDraftMode(preference.mode);
      setDraftMetricIds(
        preference.mode === 'custom' ? preference.metricIds : automaticMetricIds.slice(0, 4)
      );
      setActiveSection(preference.mode === 'custom' ? 'selection' : 'automatic');
    }
    wasOpenRef.current = isOpen;
  }, [automaticMetricIds, isOpen, preference.metricIds, preference.mode]);

  const providerMetrics = metrics.filter((metric) => metric.id.startsWith('provider-metric:'));
  const insightMetrics = metrics.filter((metric) => !metric.id.startsWith('provider-metric:'));
  const canApply = draftMode === 'auto' || draftMetricIds.length === 4;
  const chooseCustomMode = () => {
    setDraftMode('custom');
    setActiveSection('selection');
  };
  const toggleMetric = (metricId: string) => {
    chooseCustomMode();
    setDraftMetricIds((current) =>
      current.includes(metricId)
        ? current.filter((id) => id !== metricId)
        : current.length < 4
          ? [...current, metricId]
          : current
    );
  };

  return (
    <BaseCardDialog
      variant="fullscreen"
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      title="Energy KPIs"
      description="Choose and order the four metrics shown above Energy usage."
      theme={theme}
      contentClassName={cn(
        'md:left-1/2 md:right-auto md:w-[calc(100%-4rem)] md:max-w-[1200px] md:-translate-x-1/2',
        surface.shellPanel,
        surface.border
      )}
      shellBodyClassName="h-full min-h-0"
    >
      <NavigationWorkspace.Frame className="h-full min-h-0 max-h-full rounded-none border-0 bg-transparent shadow-none">
        <NavigationWorkspace.Header>
          <SheetSurfaceHeader
            title="Energy KPIs"
            description="Choose and order the four metrics shown above Energy usage."
            closeLabel="Close Energy KPIs"
            onClose={() => onOpenChange(false)}
            className="px-5 py-4 md:px-6"
          />
        </NavigationWorkspace.Header>

        <NavigationWorkspace.Body className="grid-rows-[auto_minmax(0,1fr)] md:grid-cols-[18rem_minmax(0,1fr)] md:grid-rows-1">
          <NavigationWorkspace.Sidebar className="border-r-0 border-b p-4 md:border-r md:border-b-0 md:p-5">
            <p className={`text-sm font-semibold ${surface.textPrimary}`}>KPI setup</p>
            <p className={`mt-1 text-xs leading-relaxed ${surface.textSecondary}`}>
              Choose how metrics are selected and arranged.
            </p>
            <nav aria-label="KPI setup" className="mt-4 space-y-1">
              <NavigationWorkspace.Item
                active={activeSection === 'automatic'}
                accentColor={accentColor}
              >
                <NavigationWorkspace.ItemButton
                  aria-label="Automatic"
                  aria-pressed={activeSection === 'automatic'}
                  onClick={() => {
                    setDraftMode('auto');
                    setDraftMetricIds(automaticMetricIds.slice(0, 4));
                    setActiveSection('automatic');
                  }}
                  className="!items-start py-2.5"
                >
                  <NavigationWorkspace.ItemIcon>
                    <Gauge className="h-4 w-4" />
                  </NavigationWorkspace.ItemIcon>
                  <NavigationWorkspace.ItemText
                    title="Automatic"
                    description="Adapts to available provider data"
                    descriptionClassName="!overflow-visible !text-clip !whitespace-normal break-words leading-4"
                  />
                </NavigationWorkspace.ItemButton>
              </NavigationWorkspace.Item>
              <NavigationWorkspace.Item
                active={activeSection === 'selection'}
                accentColor={accentColor}
              >
                <NavigationWorkspace.ItemButton
                  aria-label="Manual"
                  aria-pressed={activeSection === 'selection'}
                  onClick={chooseCustomMode}
                  className="!items-start py-2.5"
                >
                  <NavigationWorkspace.ItemIcon>
                    <SlidersHorizontal className="h-4 w-4" />
                  </NavigationWorkspace.ItemIcon>
                  <NavigationWorkspace.ItemText
                    title="Manual"
                    description={
                      draftMode === 'custom'
                        ? `${draftMetricIds.length} of 4 selected`
                        : 'Pin a consistent set'
                    }
                    descriptionClassName="!overflow-visible !text-clip !whitespace-normal break-words leading-4"
                  />
                </NavigationWorkspace.ItemButton>
              </NavigationWorkspace.Item>
              <NavigationWorkspace.Item
                active={activeSection === 'order'}
                accentColor={accentColor}
              >
                <NavigationWorkspace.ItemButton
                  aria-label="Order"
                  aria-pressed={activeSection === 'order'}
                  onClick={() => {
                    setDraftMode('custom');
                    setActiveSection('order');
                  }}
                  className="!items-start py-2.5"
                >
                  <NavigationWorkspace.ItemIcon>
                    <GripVertical className="h-4 w-4" />
                  </NavigationWorkspace.ItemIcon>
                  <NavigationWorkspace.ItemText
                    title="Order"
                    description="Arrange selected metrics"
                    descriptionClassName="!overflow-visible !text-clip !whitespace-normal break-words leading-4"
                  />
                </NavigationWorkspace.ItemButton>
              </NavigationWorkspace.Item>
            </nav>
          </NavigationWorkspace.Sidebar>

          <NavigationWorkspace.Content>
            <NavigationWorkspace.ScrollArea className="p-4 md:p-6">
              {activeSection === 'selection' ? (
                <div className="w-full">
                  <div className="mb-6">
                    <p className={`text-base font-semibold ${surface.textPrimary}`}>
                      Select KPIs manually
                    </p>
                    <p className={`mt-2 text-sm leading-relaxed ${surface.textSecondary}`}>
                      Select exactly four readings to keep the Energy dashboard focused on what
                      matters to you.
                    </p>
                  </div>
                  <EnergyKpiPickerGroup
                    label="Energy insights"
                    metrics={insightMetrics}
                    selectedMetricIds={draftMetricIds}
                    onToggle={toggleMetric}
                  />
                  {providerMetrics.length > 0 ? (
                    <EnergyKpiPickerGroup
                      label="Provider readings"
                      description="Live energy-related sensors exposed by the active provider."
                      metrics={providerMetrics}
                      selectedMetricIds={draftMetricIds}
                      onToggle={toggleMetric}
                    />
                  ) : null}
                </div>
              ) : activeSection === 'order' ? (
                <div className="w-full">
                  <div className="mb-6">
                    <p className={`text-base font-semibold ${surface.textPrimary}`}>
                      Order dashboard KPIs
                    </p>
                    <p className={`mt-2 text-sm leading-relaxed ${surface.textSecondary}`}>
                      Use the arrow controls to arrange metrics in dashboard order.
                    </p>
                  </div>
                  <Suspense
                    fallback={
                      <div className="flex min-h-32 items-center justify-center">
                        <EnergyLoadingIndicator />
                      </div>
                    }
                  >
                    <EnergyKpiOrderEditor
                      metrics={resolveSelectedUsageMetrics(draftMetricIds, metrics)}
                      orderedMetricIds={draftMetricIds}
                      onOrderChange={setDraftMetricIds}
                    />
                  </Suspense>
                </div>
              ) : (
                <div className="w-full">
                  <p className={`text-base font-semibold ${surface.textPrimary}`}>
                    Automatic priority
                  </p>
                  <p className={`mt-2 text-sm leading-relaxed ${surface.textSecondary}`}>
                    Navet prioritizes prepaid balance, cost, solar, battery, and grid data when
                    available, then fills remaining slots with useful usage insights.
                  </p>
                  <div className="mt-5 grid gap-2 sm:grid-cols-2">
                    {automaticMetricIds.slice(0, 4).map((metricId) => {
                      const metric = metrics.find((candidate) => candidate.id === metricId);
                      return metric ? (
                        <EnergyKpiPickerPreview key={metric.id} metric={metric} />
                      ) : null;
                    })}
                  </div>
                </div>
              )}
            </NavigationWorkspace.ScrollArea>
          </NavigationWorkspace.Content>
        </NavigationWorkspace.Body>

        <div
          className={cn(
            'flex shrink-0 items-center justify-end gap-2 border-t px-4 py-3 md:px-6',
            surface.panel,
            surface.border
          )}
        >
          <Button variant="soft" size="small" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            variant="primary"
            size="small"
            disabled={!canApply}
            onClick={() => {
              onSave({
                mode: draftMode,
                metricIds: draftMode === 'custom' ? draftMetricIds : [],
              });
              onOpenChange(false);
            }}
          >
            Apply
          </Button>
        </div>
      </NavigationWorkspace.Frame>
    </BaseCardDialog>
  );
}

function EnergyKpiPickerPreview({ metric }: { metric: EnergyUsageMetric }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div
      className={cn(
        'flex items-center gap-3 rounded-2xl border p-3',
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
        <span className={`block truncate text-xs ${surface.textSecondary}`}>{metric.period}</span>
      </span>
      <span className={`shrink-0 text-sm font-semibold ${surface.textPrimary}`}>
        {metric.value}
      </span>
    </div>
  );
}

function EnergyKpiPickerGroup({
  description,
  label,
  metrics,
  onToggle,
  selectedMetricIds,
}: {
  description?: string;
  label: string;
  metrics: EnergyUsageMetric[];
  onToggle: (metricId: string) => void;
  selectedMetricIds: string[];
}) {
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <CardDialogSection label={label} helperText={description}>
      <div className="grid gap-2 lg:grid-cols-2">
        {metrics.map((metric) => {
          const selected = selectedMetricIds.includes(metric.id);
          const disabled = !selected && selectedMetricIds.length >= 4;
          return (
            <button
              key={metric.id}
              type="button"
              aria-pressed={selected}
              disabled={disabled}
              onClick={() => onToggle(metric.id)}
              className={cn(
                'flex min-h-16 min-w-0 items-center gap-3 rounded-2xl border px-3.5 py-3 text-left transition-colors disabled:opacity-45',
                surface.border,
                selected ? undefined : surface.hoverBg
              )}
              style={
                selected
                  ? {
                      backgroundColor: withTintAlpha(accentColor, theme === 'light' ? 0.08 : 0.14),
                      borderColor: withTintAlpha(accentColor, 0.42),
                    }
                  : undefined
              }
            >
              <EntityCardHeaderIcon
                IconComponent={metric.icon}
                isActive={selected}
                size="small"
                baseColor={selected ? accentColor : metric.color}
              />
              <span className="min-w-0 flex-1">
                <span className={`block truncate text-sm font-semibold ${surface.textPrimary}`}>
                  {metric.label}
                </span>
                <span className={`block truncate text-xs ${surface.textSecondary}`}>
                  {metric.detail}
                </span>
              </span>
              <span className="shrink-0 text-right">
                <span
                  className={`block text-sm font-semibold ${surface.textPrimary}`}
                  style={selected ? { color: accentColor } : undefined}
                >
                  {metric.value}
                </span>
                <span className={`block text-[10px] ${surface.textSecondary}`}>
                  {metric.period}
                </span>
              </span>
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border',
                  surface.border,
                  selected ? 'text-white' : surface.textMuted
                )}
                style={
                  selected ? { backgroundColor: accentColor, borderColor: accentColor } : undefined
                }
                aria-hidden="true"
              >
                {selected ? <Check className="h-3.5 w-3.5" /> : null}
              </span>
            </button>
          );
        })}
      </div>
    </CardDialogSection>
  );
}

function EnergyUsageMetricCard({
  metric,
  gridColumnSpan,
  compactHeader,
}: {
  metric: EnergyUsageMetric;
  gridColumnSpan?: number;
  compactHeader: boolean;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <BaseCard
      size="small"
      surfaceVariant="muted"
      className="col-span-2 row-span-2 min-w-0"
      title={metric.label}
      subtitle={metric.period}
      headerCompact={compactHeader}
      headerLayout="title-first"
      headerLeading={
        <EntityCardHeaderIcon
          IconComponent={metric.icon}
          isActive
          size={compactHeader ? 'extra-small' : 'small'}
          baseColor={metric.color}
        />
      }
      data-testid={`energy-usage-metric-${metric.id}`}
      data-overview-module="usage-metric"
      style={
        gridColumnSpan
          ? { gridColumn: `span ${gridColumnSpan} / span ${gridColumnSpan}` }
          : undefined
      }
    >
      <div className="flex h-full min-w-0 flex-col">
        <div className={`text-2xl font-semibold tabular-nums ${surface.textPrimary}`}>
          {metric.value}
        </div>
        <p className={`mt-0.5 line-clamp-2 text-[11px] ${surface.textSecondary}`}>
          {metric.detail}
        </p>
        <div
          className={cn(
            'mt-auto border-t pt-2 text-[11px] font-medium leading-snug',
            surface.border,
            surface.textPrimary
          )}
        >
          {metric.footer}
        </div>
      </div>
    </BaseCard>
  );
}

function resolveMetricCardSpans(metricRowSpan?: number) {
  if (!metricRowSpan || metricRowSpan < 8) return [2, 2, 2, 2];
  const baseSpan = Math.floor(metricRowSpan / 4);
  const remainder = metricRowSpan % 4;
  return Array.from({ length: 4 }, (_, index) => baseSpan + (index < remainder ? 1 : 0));
}

function HistoryMetricRow({ metrics }: { metrics: EnergyUsageMetric[] }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  return (
    <div className={cn('grid grid-cols-2 border-y lg:grid-cols-4', surface.border)}>
      {metrics.map((metric) => (
        <HistoryMetric
          key={metric.id}
          label={metric.label}
          value={metric.value}
          icon={metric.icon}
          color={metric.color}
        />
      ))}
    </div>
  );
}

function HistoryMetric({
  label,
  value,
  icon: Icon,
  color,
}: {
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  return (
    <div
      className={cn(
        'flex items-center gap-2.5 px-4 py-3 border-r border-b lg:border-b-0 last:border-r-0',
        surface.border
      )}
    >
      <span
        className="flex h-7 w-7 items-center justify-center rounded-full"
        style={{ color, backgroundColor: `${color}14` }}
      >
        <Icon className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
      <div>
        <div className={`text-sm font-semibold tabular-nums ${surface.textPrimary}`}>{value}</div>
        <div className={`text-[10px] ${surface.textSecondary}`}>{label}</div>
      </div>
    </div>
  );
}

function SourceSummaryMetric({ label, value }: { label: string; value: string }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  return (
    <div className={cn('rounded-2xl border p-3', surface.border, surface.subtleBg)}>
      <dt className={`text-[10px] ${surface.textSecondary}`}>{label}</dt>
      <dd className={`mt-1 text-base font-semibold tabular-nums ${surface.textPrimary}`}>
        {value}
      </dd>
    </div>
  );
}

function SelectedPeriodView({
  bucket,
  contributions,
  untrackedEnergyKWh,
  isBreakdownLoading,
  showDeviceBreakdown,
  periodCost,
}: {
  bucket: EnergyHistoryBucket;
  contributions: EnergyHistoryContribution[];
  untrackedEnergyKWh: number;
  isBreakdownLoading: boolean;
  showDeviceBreakdown: boolean;
  periodCost?: number;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const metrics: SelectedPeriodMetricData[] = bucket.hasData
    ? [
        {
          id: 'average',
          label: 'Average',
          value: formatPowerValue(bucket.averagePowerW),
          icon: Gauge,
          color: '#2dd4bf',
        },
        {
          id: 'low',
          label: 'Low',
          value: formatPowerValue(bucket.lowPowerW),
          icon: TrendingDown,
          color: '#38bdf8',
        },
        {
          id: 'peak',
          label: 'Peak',
          value: formatPowerValue(bucket.peakPowerW),
          icon: TrendingUp,
          color: '#fb923c',
        },
      ]
    : [];

  return (
    <section
      id="energy-selected-period-details"
      className="flex min-h-0 flex-1 flex-col"
      aria-label="Selected period details"
      aria-live="polite"
      data-testid="energy-selected-period-details"
    >
      {bucket.hasData ? (
        <div className="grid min-h-0 flex-1 grid-rows-[auto_minmax(0,1fr)] overflow-hidden sm:grid-cols-[minmax(16rem,0.75fr)_minmax(0,1.25fr)] sm:grid-rows-1">
          <div className="relative flex min-w-0 flex-col p-3">
            <div
              className={cn(
                'pointer-events-none absolute inset-x-3 bottom-0 border-b sm:inset-x-auto sm:inset-y-3 sm:right-0 sm:border-r sm:border-b-0',
                surface.border
              )}
              data-testid="energy-selected-period-divider"
              aria-hidden="true"
            />
            <div className="min-w-0">
              <h3 className={`text-xs font-semibold ${surface.textPrimary}`}>Energy used</h3>
              <p className={`mt-0.5 text-[11px] ${surface.textSecondary}`}>
                Total recorded during this period
              </p>
            </div>
            <div className={`mt-4 text-3xl font-semibold tabular-nums ${surface.textPrimary}`}>
              {formatEnergyValue(bucket.energyKWh)} kWh
            </div>
            {typeof periodCost === 'number' ? (
              <div
                className={`mt-0.5 flex items-center gap-1.5 text-[11px] ${surface.textSecondary}`}
              >
                <CircleDollarSign className="h-3 w-3" aria-hidden="true" />
                <span>
                  Recorded cost{' '}
                  <strong className={`font-semibold tabular-nums ${surface.textPrimary}`}>
                    {formatEnergyValue(periodCost)}
                  </strong>
                </span>
              </div>
            ) : null}

            <dl
              className="mt-auto grid shrink-0 grid-cols-3 gap-2 pt-4"
              data-testid="energy-selected-period-metrics"
            >
              {metrics.map((metric) => (
                <SelectedPeriodMetric key={metric.id} metric={metric} />
              ))}
            </dl>
          </div>

          <div
            className="min-h-0 overflow-hidden p-3"
            data-testid="energy-selected-period-device-panel"
          >
            <SelectedPeriodDeviceBreakdown
              totalEnergyKWh={bucket.energyKWh}
              contributions={contributions}
              untrackedEnergyKWh={untrackedEnergyKWh}
              isLoading={isBreakdownLoading}
              isAvailable={showDeviceBreakdown}
            />
          </div>
        </div>
      ) : (
        <p className={`px-3 py-5 text-sm ${surface.textSecondary}`}>
          Choose another bar to inspect recorded usage.
        </p>
      )}
    </section>
  );
}

function SelectedPeriodDeviceBreakdown({
  totalEnergyKWh,
  contributions,
  untrackedEnergyKWh,
  isLoading,
  isAvailable,
}: {
  totalEnergyKWh: number;
  contributions: EnergyHistoryContribution[];
  untrackedEnergyKWh: number;
  isLoading: boolean;
  isAvailable: boolean;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const trackedEnergyKWh = contributions.reduce((total, item) => total + item.energyKWh, 0);
  const contributionTotalKWh = Math.max(totalEnergyKWh, trackedEnergyKWh + untrackedEnergyKWh);
  const subtleFill =
    theme === 'light'
      ? '#f3f4f6'
      : theme === 'black'
        ? 'rgba(255,255,255,0.05)'
        : 'rgba(255,255,255,0.08)';
  const rows = [
    ...contributions,
    ...(untrackedEnergyKWh > 0
      ? [
          {
            id: 'untracked',
            name: 'Untracked',
            energyKWh: untrackedEnergyKWh,
            averagePowerW: 0,
            share: totalEnergyKWh > 0 ? untrackedEnergyKWh / totalEnergyKWh : 0,
          },
        ]
      : []),
  ].sort((left, right) => right.energyKWh - left.energyKWh);
  const rankedRows = rows.map((row) => ({
    ...row,
    displayShare: contributionTotalKWh > 0 ? row.energyKWh / contributionTotalKWh : 0,
    color: colorForContribution(row.id),
  }));

  return (
    <div className="flex h-full min-h-0 flex-col overflow-hidden">
      <div className="flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <h3 className={`text-xs font-semibold ${surface.textPrimary}`}>What used the most</h3>
          <p className={`mt-0.5 text-[11px] ${surface.textSecondary}`}>
            Ranked by energy during this period
          </p>
        </div>
        {rows.length > 0 ? (
          <span className={`text-[10px] ${surface.textMuted}`}>
            {rows.length} contributor{rows.length === 1 ? '' : 's'}
          </span>
        ) : null}
      </div>

      <OverlayScrollArea
        className="mt-4 flex min-h-0 flex-1 flex-col"
        viewportProps={{ 'data-testid': 'energy-selected-period-device-scroll' }}
        contentClassName="flex min-h-full flex-col pr-3"
      >
        {isLoading ? (
          <div className="flex h-full min-h-20 items-center justify-center">
            <EnergyLoadingIndicator />
          </div>
        ) : !isAvailable ? (
          <p className={`py-4 text-xs leading-5 ${surface.textSecondary}`}>
            Device contribution is not available for this source or period.
          </p>
        ) : rows.length === 0 ? (
          <p className={`py-4 text-xs leading-5 ${surface.textSecondary}`}>
            No device-level history is available for this period.
          </p>
        ) : (
          <div className="min-w-0">
            {rankedRows.length > 0 ? (
              <div className="grid min-w-0 grid-cols-1 gap-x-8 gap-y-3.5 sm:grid-cols-2">
                {rankedRows.map((row) => (
                  <SelectedPeriodContributionRow
                    key={row.id}
                    row={row}
                    subtleFill={subtleFill}
                    textPrimary={surface.textPrimary}
                    textSecondary={surface.textSecondary}
                  />
                ))}
              </div>
            ) : null}
          </div>
        )}
      </OverlayScrollArea>
    </div>
  );
}

interface SelectedPeriodContributionRowData {
  id: string;
  name: string;
  energyKWh: number;
  displayShare: number;
  color: string;
}

function SelectedPeriodContributionRow({
  row,
  subtleFill,
  textPrimary,
  textSecondary,
}: {
  row: SelectedPeriodContributionRowData;
  subtleFill: string;
  textPrimary: string;
  textSecondary: string;
}) {
  const share = Math.round(row.displayShare * 100);

  return (
    <div className="min-w-0">
      <div className="flex min-w-0 items-center gap-2.5">
        <Zap className="h-4 w-4 shrink-0" style={{ color: row.color }} aria-hidden="true" />
        <span className={`min-w-0 flex-1 truncate text-sm font-medium ${textPrimary}`}>
          {row.name}
        </span>
        <span className={`shrink-0 text-sm font-semibold tabular-nums ${textPrimary}`}>
          {formatEnergyValue(row.energyKWh)} kWh
        </span>
      </div>
      <div className="mt-0.5 flex items-center gap-3 pl-[1.625rem]">
        <div
          className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full"
          style={{ backgroundColor: subtleFill }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full"
            style={{ width: `${Math.max(2, row.displayShare * 100)}%`, backgroundColor: row.color }}
          />
        </div>
        <span className={`w-8 shrink-0 text-right text-[11px] tabular-nums ${textSecondary}`}>
          {share}%
        </span>
      </div>
    </div>
  );
}

function colorForContribution(id: string) {
  if (id === 'untracked') return '#94a3b8';
  const colors = ['#3b82f6', '#f59e0b', '#10b981', '#d946ef', '#8b5cf6'];
  let hash = 0;
  for (let index = 0; index < id.length; index += 1) hash = (hash * 31 + id.charCodeAt(index)) | 0;
  return colors[Math.abs(hash) % colors.length];
}

interface SelectedPeriodMetricData {
  id: string;
  label: string;
  value: string;
  icon: LucideIcon;
  color: string;
}

function SelectedPeriodMetric({ metric }: { metric: SelectedPeriodMetricData }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const Icon = metric.icon;
  const containerSurface = theme === 'black' ? 'bg-white/[0.04]' : surface.subtleBg;

  return (
    <div className={cn('min-w-0 rounded-xl border px-2.5 py-2', surface.border, containerSurface)}>
      <dt className="flex items-center gap-1.5">
        <span
          className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full"
          style={{ color: metric.color, backgroundColor: `${metric.color}14` }}
        >
          <Icon className="h-3 w-3" aria-hidden="true" />
        </span>
        <span className={`truncate text-[11px] font-medium ${surface.textSecondary}`}>
          {metric.label}
        </span>
      </dt>
      <dd className={cn('mt-1 text-base font-semibold tabular-nums', surface.textPrimary)}>
        {metric.value}
      </dd>
    </div>
  );
}

function isSameLocalDate(leftMs: number, rightMs: number) {
  const left = new Date(leftMs);
  const right = new Date(rightMs);
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

function getHistoryNavigationUnit(range: EnergyHistoryRange) {
  if (range === 'custom') return null;
  return range === 'today' ? 'day' : range;
}

function isSameHistoryPeriod(range: EnergyHistoryRange, leftMs: number, rightMs: number) {
  const left = new Date(leftMs);
  const right = new Date(rightMs);
  if (range === 'year') return left.getFullYear() === right.getFullYear();
  if (range === 'month') {
    return left.getFullYear() === right.getFullYear() && left.getMonth() === right.getMonth();
  }
  return isSameLocalDate(leftMs, rightMs);
}

function shiftHistoryReference(range: EnergyHistoryRange, timestampMs: number, direction: -1 | 1) {
  const date = new Date(timestampMs);
  if (range === 'year') {
    return new Date(date.getFullYear() + direction, 0, 1, 12).getTime();
  }
  if (range === 'month') {
    return new Date(date.getFullYear(), date.getMonth() + direction, 1, 12).getTime();
  }
  date.setHours(12, 0, 0, 0);
  date.setDate(date.getDate() + direction * (range === 'week' ? 7 : 1));
  return date.getTime();
}

function formatHistoryPeriodContext(
  range: EnergyHistoryRange,
  window: EnergyHistoryWindow,
  locale: string
) {
  if (range === 'today') {
    return new Intl.DateTimeFormat(locale, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    }).format(new Date(window.startMs));
  }

  if (range === 'week') {
    const start = new Date(window.startMs);
    const end = new Date(window.endMs - 1);
    const formatter = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
    });
    if (start.getFullYear() === end.getFullYear()) {
      return `${formatter.format(start)}–${formatter.format(end)}, ${end.getFullYear()}`;
    }
    const formatterWithYear = new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      year: 'numeric',
    });
    return `${formatterWithYear.format(start)}–${formatterWithYear.format(end)}`;
  }

  if (range === 'month') {
    return new Intl.DateTimeFormat(locale, { month: 'long', year: 'numeric' }).format(
      new Date(window.startMs)
    );
  }

  if (range === 'year') {
    return String(new Date(window.startMs).getFullYear());
  }

  return RANGE_LABELS[range];
}

function formatPowerValue(powerW: number) {
  return Math.abs(powerW) >= 1000
    ? `${formatEnergyValue(powerW / 1000)} kW`
    : `${Math.round(powerW)} W`;
}

function findLowestPowerBucket(buckets: EnergyHistoryBucket[]) {
  return buckets
    .filter((bucket) => bucket.hasData)
    .reduce<EnergyHistoryBucket | null>(
      (lowest, bucket) => (!lowest || bucket.lowPowerW < lowest.lowPowerW ? bucket : lowest),
      null
    );
}

function findLowestEnergyBucket(buckets: EnergyHistoryBucket[]) {
  return buckets.reduce<EnergyHistoryBucket | null>(
    (lowest, bucket) => (!lowest || bucket.energyKWh < lowest.energyKWh ? bucket : lowest),
    null
  );
}

function findHighestEnergyBucket(buckets: EnergyHistoryBucket[]) {
  return buckets.reduce<EnergyHistoryBucket | null>(
    (highest, bucket) => (!highest || bucket.energyKWh > highest.energyKWh ? bucket : highest),
    null
  );
}

function getEnergyBucketUnit(
  bucket: EnergyHistoryBucket | undefined
): 'hour' | 'day' | 'month' | 'period' {
  if (!bucket) return 'period';
  const durationMs = bucket.endMs - bucket.startMs;
  if (durationMs <= 2 * 60 * 60 * 1000) return 'hour';
  if (durationMs <= 2 * 24 * 60 * 60 * 1000) return 'day';
  return 'month';
}

function formatBucketCount(count: number, unit: string) {
  return `${count} ${unit}${count === 1 ? '' : 's'}`;
}

function capitalizeFirst(value: string) {
  return `${value.charAt(0).toUpperCase()}${value.slice(1)}`;
}

function formatEnergyComparison(comparisonPercent: number | undefined, isToday: boolean) {
  if (typeof comparisonPercent !== 'number') return 'Previous-period comparison unavailable';
  const percentage = Math.round(Math.abs(comparisonPercent) * 100);
  const reference = isToday ? 'by this time yesterday' : 'the previous period';
  if (percentage < 1) {
    return `Energy use is in line with ${isToday ? 'this time yesterday' : reference}`;
  }
  return `${percentage}% ${comparisonPercent < 0 ? 'less' : 'more'} energy used than ${reference}`;
}

function formatRelativeToAverage(
  value: number,
  average: number,
  direction: 'above' | 'below',
  averageLabel: string
) {
  if (average <= 0) return 'Average comparison unavailable';
  const percentage = Math.round((Math.abs(value - average) / average) * 100);
  return `${percentage}% ${direction} ${averageLabel}`;
}

function formatLowestOccurrence(startMs: number, endMs: number) {
  const durationMs = endMs - startMs;
  if (durationMs <= 2 * 60 * 60 * 1000) {
    return `Lowest between ${new Date(startMs).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}–${new Date(endMs).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (durationMs <= 2 * 24 * 60 * 60 * 1000) {
    return `Lowest day: ${new Date(startMs).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  }
  return `Lowest month: ${new Date(startMs).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
}

function formatTimeWindow(startMs: number, endMs: number) {
  const start = new Date(startMs);
  const end = new Date(endMs);
  if (endMs - startMs > 2 * 60 * 60 * 1000 && endMs - startMs <= 27 * 60 * 60 * 1000) {
    return start.toLocaleDateString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
    });
  }
  const sameDay = start.toDateString() === end.toDateString();
  return sameDay
    ? `${start.toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}, ${start.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}–${end.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`
    : `${start.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}–${end.toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}`;
}

function formatPeakOccurrence(startMs: number, endMs: number) {
  const durationMs = endMs - startMs;
  if (durationMs <= 2 * 60 * 60 * 1000) {
    return `Highest between ${new Date(startMs).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}–${new Date(endMs).toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' })}`;
  }
  if (durationMs <= 2 * 24 * 60 * 60 * 1000) {
    return `Highest day: ${new Date(startMs).toLocaleDateString(undefined, { weekday: 'short', month: 'short', day: 'numeric' })}`;
  }
  return `Highest month: ${new Date(startMs).toLocaleDateString(undefined, { month: 'long', year: 'numeric' })}`;
}
