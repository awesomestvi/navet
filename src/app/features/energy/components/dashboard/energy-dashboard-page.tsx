import { AlertTriangle, CheckCircle2, Flame, Leaf, PlugZap, Sun, Zap } from 'lucide-react';
import { memo } from 'react';
import { TabList, Tabs, TabTrigger, Text } from '@/app/components/primitives';
import { themeColorValues } from '@/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useEnergyLoadHistory } from '@/app/features/energy/hooks/use-energy-load-history';
import type {
  EnergyConsumer,
  EnergyDashboardModel,
  EnergyRange,
  EnergySeriesPoint,
  EnergySourceDiagnostic,
} from '@/app/features/energy/types/energy.types';
import {
  formatEnergyPercent,
  formatEnergyValue,
} from '@/app/features/energy/utils/energy-formatters';
import { useI18n, useTheme } from '@/app/hooks';
import { EnergyNowCardView } from '../widgets/energy-now-card-view';

interface EnergyDashboardPageProps {
  dashboard: EnergyDashboardModel;
  range: EnergyRange;
  onRangeChange: (range: EnergyRange) => void;
  selectedNodeId: EnergyDashboardModel['nodes'][number]['id'] | null;
  onNodeSelect: (nodeId: EnergyDashboardModel['nodes'][number]['id']) => void;
  sourceDiagnostics: EnergySourceDiagnostic[];
}

const rangeOptions: EnergyRange[] = ['now', 'today', 'week', 'month'];
const heroLegendColors = {
  generated: themeColorValues.green,
  liveLoad: themeColorValues.teal,
  gridImport: themeColorValues.orange,
  trackedDevices: themeColorValues.blue,
};

export const EnergyDashboardPage = memo(function EnergyDashboardPage({
  dashboard,
  range,
  onRangeChange,
  sourceDiagnostics,
}: EnergyDashboardPageProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const selectedRange = dashboard.ranges[range];
  const liveWatts = Math.round(dashboard.totals.currentLoadW);
  const gridWatts = Math.round(Math.max(dashboard.totals.importW, dashboard.totals.exportW));
  const trackedKWh = dashboard.topConsumers.reduce((sum, consumer) => sum + consumer.energyKWh, 0);
  const unavailableDeviceCount = getUnavailableDeviceDiagnostics(
    dashboard.topConsumers,
    sourceDiagnostics
  ).length;
  const trackedDeviceCount = dashboard.topConsumers.length + unavailableDeviceCount;
  const sourceUnavailableCount = getSourceDiagnostics(sourceDiagnostics).filter(
    (source) => source.status === 'configured_unavailable'
  ).length;

  return (
    <div className="space-y-5">
      <section
        className={`overflow-hidden rounded-[28px] border ${surface.border} ${surface.panel} ${surface.cardShadow}`}
      >
        <div className="grid min-h-[28rem] gap-8 p-5 md:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(18rem,22rem)]">
          <div className="flex min-w-0 flex-col">
            <p
              className={`text-[11px] font-semibold uppercase tracking-[0.2em] md:text-xs md:tracking-[0.24em] ${surface.textMuted}`}
            >
              {t('energy.hero.eyebrow')}
            </p>

            <h1
              className={`mt-1.5 max-w-3xl text-[1.375rem] leading-[1.1] font-semibold tracking-tight md:mt-4 md:text-4xl md:leading-tight ${surface.textPrimary}`}
            >
              {t('energy.hero.title')}
            </h1>

            <div className="mt-5 hidden flex-wrap gap-3 md:mt-6 md:flex">
              <MinimalStat
                label="Used now"
                value={`${liveWatts} W`}
                dotColor={heroLegendColors.liveLoad}
                className="min-w-[10.5rem]"
                surfaceText={surface.textSecondary}
              />
              <MinimalStat
                label="Imported today"
                value={`${formatEnergyValue(dashboard.totals.importTodayKWh)} kWh`}
                dotColor={heroLegendColors.gridImport}
                className="min-w-[12.5rem]"
                surfaceText={surface.textSecondary}
              />
              {dashboard.totals.solarTodayKWh > 0 ? (
                <MinimalStat
                  label="Generated today"
                  value={`${formatEnergyValue(dashboard.totals.solarTodayKWh)} kWh`}
                  dotColor={heroLegendColors.generated}
                  className="min-w-[13rem]"
                  surfaceText={surface.textSecondary}
                />
              ) : null}
              <MinimalStat
                label="Tracked devices"
                value={`${trackedDeviceCount}`}
                dotColor={heroLegendColors.trackedDevices}
                surfaceText={surface.textSecondary}
              />
            </div>

            <div className="mt-auto hidden pt-10 xl:block">
              <DeviceTable
                accentColor={accentColor}
                consumers={dashboard.topConsumers}
                gridImportTodayKWh={dashboard.totals.importTodayKWh}
                sourceDiagnostics={sourceDiagnostics}
                surface={surface}
              />
            </div>
          </div>

          <div className="grid min-w-0 gap-6 content-start">
            <LoadOrb
              generatedColor={heroLegendColors.generated}
              generatedTodayKWh={dashboard.totals.solarTodayKWh}
              loadW={liveWatts}
              todayKWh={dashboard.totals.importTodayKWh}
              importColor={heroLegendColors.gridImport}
              surface={surface}
              trackedColor={heroLegendColors.trackedDevices}
              trackedTodayKWh={trackedKWh}
            />
            <SourceDiagnostics
              accentColor={accentColor}
              sources={sourceDiagnostics}
              unavailableCount={sourceUnavailableCount}
              surface={surface}
            />
          </div>

          <div className="xl:hidden">
            <DeviceTable
              accentColor={accentColor}
              consumers={dashboard.topConsumers}
              gridImportTodayKWh={dashboard.totals.importTodayKWh}
              sourceDiagnostics={sourceDiagnostics}
              surface={surface}
            />
          </div>
        </div>
      </section>

      <section className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_20rem]">
        <CompactLoadSparklines
          accentColor={accentColor}
          consumers={dashboard.topConsumers}
          surface={surface}
          wholeHomeCurrentW={dashboard.totals.currentLoadW}
          wholeHomePoints={selectedRange.liveConsumption}
          wholeHomeTodayKWh={selectedRange.totalUsageKWh}
        />
        <section
          className={`rounded-[28px] border p-5 ${surface.border} ${surface.panel} ${surface.cardShadow}`}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <div
                className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
              >
                Recorder
              </div>
              <h2 className={`mt-2 text-lg font-semibold ${surface.textPrimary}`}>
                {rangeLabel(range)} view
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
                    {rangeLabel(option)}
                  </TabTrigger>
                ))}
              </TabList>
            </Tabs>
          </div>

          <div className="mt-6 grid gap-3">
            <RangeRow
              label="Grid import"
              value={`${formatEnergyValue(selectedRange.gridImportKWh)} kWh`}
              surface={surface}
            />
            <RangeRow
              label="Tracked devices"
              value={`${formatEnergyValue(trackedKWh)} kWh`}
              surface={surface}
            />
            <RangeRow label="Live grid" value={`${gridWatts} W`} surface={surface} />
          </div>

          {selectedRange.energyBreakdown.length === 0 ? (
            <Text tone="muted" className="mt-5 text-sm">
              Not enough recorder history for this range yet.
            </Text>
          ) : null}
        </section>
      </section>
    </div>
  );
});

function CompactLoadSparklines({
  accentColor,
  consumers,
  surface,
  wholeHomeCurrentW,
  wholeHomePoints,
  wholeHomeTodayKWh,
}: {
  accentColor: string;
  consumers: EnergyConsumer[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  wholeHomeCurrentW: number;
  wholeHomePoints: EnergySeriesPoint[];
  wholeHomeTodayKWh: number;
}) {
  return (
    <section
      className={`rounded-[28px] border p-5 ${surface.border} ${surface.panel} ${surface.cardShadow}`}
    >
      <div className="mb-4">
        <div>
          <div
            className={`text-[11px] font-semibold uppercase tracking-[0.18em] ${surface.textMuted}`}
          >
            Live use
          </div>
          <h2 className={`mt-2 text-lg font-semibold ${surface.textPrimary}`}>Sparklines</h2>
        </div>
      </div>

      <div className="grid gap-3 md:grid-cols-3">
        <div className="h-52 min-w-0">
          <EnergyNowCardView
            accentColor={accentColor}
            currentLoadW={wholeHomeCurrentW}
            size="medium"
            title="Whole home"
            todayUsageKWh={wholeHomeTodayKWh}
            trend={wholeHomePoints}
          />
        </div>
        {consumers.map((consumer) => (
          <DeviceSparklineRow key={consumer.id} accentColor={accentColor} consumer={consumer} />
        ))}
      </div>
    </section>
  );
}

function DeviceSparklineRow({
  accentColor,
  consumer,
}: {
  accentColor: string;
  consumer: EnergyConsumer;
}) {
  const points = useEnergyLoadHistory(consumer.powerEntityId, consumer.powerW);

  return (
    <div className="h-52 min-w-0">
      <EnergyNowCardView
        accentColor={accentColor}
        currentLoadW={consumer.powerW}
        size="medium"
        title={consumer.name}
        todayUsageKWh={consumer.energyKWh}
        trend={points}
      />
    </div>
  );
}

function MinimalStat({
  label,
  value,
  dotColor,
  className = '',
  surfaceText,
}: {
  label: string;
  value: string;
  dotColor: string;
  className?: string;
  surfaceText: string;
}) {
  return (
    <div className={`flex items-center gap-2 text-sm ${surfaceText} ${className}`}>
      <span className="h-2 w-2 rounded-full" style={{ backgroundColor: dotColor }} />
      <span className="font-semibold tabular-nums">{value}</span>
      <span>{label}</span>
    </div>
  );
}

function LoadOrb({
  generatedColor,
  generatedTodayKWh,
  importColor,
  loadW,
  todayKWh,
  surface,
  trackedColor,
  trackedTodayKWh,
}: {
  generatedColor: string;
  generatedTodayKWh: number;
  importColor: string;
  loadW: number;
  todayKWh: number;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
  trackedColor: string;
  trackedTodayKWh: number;
}) {
  const dots = buildOrbDots();
  const orbShares = getLoadOrbShares({
    generatedKWh: generatedTodayKWh,
    importedKWh: todayKWh,
    trackedKWh: trackedTodayKWh,
  });

  return (
    <div className="relative flex min-h-[19rem] min-w-0 items-center justify-center overflow-hidden">
      <div className="absolute inset-0" aria-hidden="true">
        {dots.map((dot) => (
          <span
            key={dot.id}
            className="absolute rounded-full"
            style={{
              backgroundColor: getLoadOrbDotColor({
                angle: dot.angle,
                generatedColor,
                importColor,
                shares: orbShares,
                trackedColor,
              }),
              height: dot.size,
              left: `calc(50% + ${dot.x}px)`,
              opacity: dot.opacity,
              top: `calc(50% + ${dot.y}px)`,
              transform: 'translate(-50%, -50%)',
              width: dot.size,
            }}
          />
        ))}
      </div>
      <div
        className={`relative flex h-36 w-36 flex-col items-center justify-center rounded-full border ${surface.border} ${surface.panel}`}
      >
        <div className={`text-4xl font-semibold tracking-tight ${surface.textPrimary}`}>
          {loadW}
        </div>
        <div className={`text-sm font-medium ${surface.textSecondary}`}>Watts now</div>
        <div className={`mt-1 text-xs ${surface.textMuted}`}>
          {formatEnergyValue(todayKWh)} kWh today
        </div>
      </div>
    </div>
  );
}

function DeviceTable({
  accentColor,
  consumers,
  gridImportTodayKWh,
  sourceDiagnostics,
  surface,
}: {
  accentColor: string;
  consumers: EnergyConsumer[];
  gridImportTodayKWh: number;
  sourceDiagnostics: EnergySourceDiagnostic[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const unavailableDevices = getUnavailableDeviceDiagnostics(consumers, sourceDiagnostics);

  return (
    <section className="min-w-0">
      <div className="mb-3">
        <div className={`text-xs font-medium ${surface.textMuted}`}>Devices</div>
        <h2 className={`text-lg font-semibold ${surface.textPrimary}`}>Tracked by HA Energy</h2>
      </div>

      <div className="overflow-hidden rounded-[22px]">
        {consumers.length === 0 ? (
          <div className={`px-4 py-5 text-sm ${surface.textMuted}`}>
            No available device usage has been reported yet.
          </div>
        ) : (
          <>
            <div
              className={`hidden grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] items-center gap-3 px-4 pb-2 text-xs font-medium sm:grid ${surface.textMuted}`}
            >
              <div>Device</div>
              <div className="text-right">Now</div>
              <div className="text-right">Today</div>
              <div className="text-right">Status</div>
            </div>
            {consumers.map((consumer, index) => (
              <div
                key={consumer.id}
                className={`grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] sm:items-center ${
                  index % 2 === 0 ? surface.subtleBg : ''
                }`}
              >
                <div className="flex min-w-0 items-center justify-between gap-3 sm:block">
                  <div className="min-w-0">
                    <div className={`truncate font-medium ${surface.textPrimary}`}>
                      {consumer.name}
                    </div>
                    <div className={`truncate text-xs sm:block ${surface.textMuted}`}>
                      {getDeviceUsageSubtitle(consumer, gridImportTodayKWh)}
                    </div>
                  </div>
                  <div className="flex shrink-0 justify-end sm:hidden">
                    <DeviceStatusSwitch accentColor={accentColor} status={consumer.status} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 sm:contents">
                  <div className="min-w-0">
                    <div className={`text-xs font-medium sm:hidden ${surface.textMuted}`}>Now</div>
                    <div className={`font-medium sm:text-right ${surface.textPrimary}`}>
                      {formatEnergyValue(consumer.powerW / 1000)} kW
                    </div>
                  </div>
                  <div className="min-w-0">
                    <div className={`text-xs font-medium sm:hidden ${surface.textMuted}`}>
                      Today
                    </div>
                    <div className={`sm:text-right ${surface.textSecondary}`}>
                      {formatEnergyValue(consumer.energyKWh)} kWh
                    </div>
                  </div>
                </div>
                <div className="hidden justify-end sm:flex">
                  <DeviceStatusSwitch accentColor={accentColor} status={consumer.status} />
                </div>
              </div>
            ))}
          </>
        )}
        {unavailableDevices.length > 0 ? (
          <div className={`border-t ${surface.border}`}>
            {unavailableDevices.map((device, index) => (
              <div
                key={device.id}
                className={`grid gap-3 px-4 py-3 text-sm sm:grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] sm:items-center ${
                  consumers.length === 0 && index % 2 === 0 ? surface.subtleBg : ''
                }`}
              >
                <div className="min-w-0 sm:col-span-2">
                  <div className={`truncate font-medium ${surface.textSecondary}`}>
                    {device.label}
                  </div>
                  <div className={`truncate text-xs ${surface.textMuted}`}>Unavailable</div>
                </div>
                <div className={`hidden text-right text-sm sm:block ${surface.textMuted}`}>-</div>
                <div className={`text-xs font-medium sm:text-right ${surface.textMuted}`}>
                  Unavailable
                </div>
              </div>
            ))}
          </div>
        ) : null}
      </div>
    </section>
  );
}

function getDeviceUsageSubtitle(consumer: EnergyConsumer, gridImportTodayKWh: number) {
  if (consumer.status === 'active') {
    return `Active · ${formatEnergyPercent(consumer.shareOfLoad * 100)}% of live load`;
  }

  if (consumer.energyKWh > 0) {
    const gridShare =
      gridImportTodayKWh > 0
        ? formatEnergyPercent((consumer.energyKWh / gridImportTodayKWh) * 100)
        : null;
    return gridShare
      ? `Idle · ${gridShare}% of grid consumed today`
      : `Idle · ${formatEnergyValue(consumer.energyKWh)} kWh today`;
  }

  return 'Idle · no live draw';
}

function getUnavailableDeviceDiagnostics(
  consumers: EnergyConsumer[],
  sourceDiagnostics: EnergySourceDiagnostic[]
) {
  const visibleConsumerIds = new Set(consumers.map((consumer) => consumer.id));
  return sourceDiagnostics.filter(
    (source) =>
      source.id.startsWith('device:') &&
      source.status === 'configured_unavailable' &&
      source.entityId &&
      !visibleConsumerIds.has(source.entityId)
  );
}

function DeviceStatusSwitch({
  accentColor,
  status,
}: {
  accentColor: string;
  status: EnergyConsumer['status'];
}) {
  return (
    <span
      className="inline-flex h-5 w-9 items-center rounded-full bg-white/18 p-0.5"
      style={status === 'active' ? { backgroundColor: `${accentColor}cc` } : undefined}
    >
      <span
        className={`h-4 w-4 rounded-full bg-white transition-transform ${
          status === 'active' ? 'translate-x-4' : ''
        }`}
      />
    </span>
  );
}

function SourceDiagnostics({
  accentColor,
  sources,
  unavailableCount,
  surface,
}: {
  accentColor: string;
  sources: EnergySourceDiagnostic[];
  unavailableCount: number;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const sourceRows = getSourceDiagnostics(sources);

  return (
    <section
      className={`min-w-0 overflow-hidden rounded-[24px] border p-4 ${surface.border} ${surface.panelMuted}`}
    >
      <div className="flex items-center justify-between gap-3">
        <div>
          <div className={`text-xs font-medium ${surface.textMuted}`}>Home Assistant Energy</div>
          <h2 className={`text-base font-semibold ${surface.textPrimary}`}>Sources</h2>
        </div>
        {unavailableCount > 0 ? (
          <div className="inline-flex items-center gap-1.5 rounded-full bg-amber-400/15 px-2.5 py-1 text-xs font-medium text-amber-300">
            <AlertTriangle className="h-3.5 w-3.5" />
            {unavailableCount} unavailable
          </div>
        ) : (
          <div
            className="inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium"
            style={{ backgroundColor: `${accentColor}24`, color: accentColor }}
          >
            <CheckCircle2 className="h-3.5 w-3.5" />
            Ready
          </div>
        )}
      </div>

      <div className="mt-4 grid gap-2">
        {sourceRows.map((source) => (
          <div key={source.id} className="flex min-w-0 items-center justify-between gap-3 text-sm">
            <div className="flex min-w-0 items-center gap-2">
              <SourceIcon source={source} accentColor={accentColor} />
              <div className="min-w-0">
                <div className={`truncate font-medium ${surface.textPrimary}`}>{source.label}</div>
                <div className={`truncate text-xs ${surface.textMuted}`}>
                  {source.entityId ?? source.liveEntityId}
                </div>
              </div>
            </div>
            <div className={`shrink-0 text-right text-xs font-medium ${surface.textSecondary}`}>
              {formatDiagnosticStatus(source)}
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SourceIcon({
  accentColor,
  source,
}: {
  accentColor: string;
  source: EnergySourceDiagnostic;
}) {
  if (source.status === 'configured_unavailable') {
    return <AlertTriangle className="h-4 w-4 shrink-0 text-amber-300" />;
  }

  const iconClassName = 'h-4 w-4 shrink-0';
  if (source.id === 'grid-import') {
    return <Zap className={iconClassName} style={{ color: accentColor }} />;
  }
  if (source.id === 'grid-export') {
    return <PlugZap className={`${iconClassName} text-amber-300`} />;
  }
  if (source.id === 'solar') {
    return <Sun className={iconClassName} style={{ color: themeColorValues.yellow }} />;
  }
  if (source.id === 'gas') {
    return <Flame className={iconClassName} style={{ color: themeColorValues.red }} />;
  }

  return <Leaf className={iconClassName} style={{ color: themeColorValues.green }} />;
}

function getSourceDiagnostics(sourceDiagnostics: EnergySourceDiagnostic[]) {
  return sourceDiagnostics.filter((source) => !source.id.startsWith('device:'));
}

function RangeRow({
  label,
  value,
  surface,
}: {
  label: string;
  value: string;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  return (
    <div className="flex items-center justify-between gap-4">
      <div className={`text-sm ${surface.textSecondary}`}>{label}</div>
      <div className={`text-sm font-semibold ${surface.textPrimary}`}>{value}</div>
    </div>
  );
}

function formatDiagnosticStatus(source: EnergySourceDiagnostic) {
  if (source.status === 'configured_unavailable') {
    return 'Unavailable';
  }

  if (source.status === 'configured_idle') {
    return 'Idle';
  }

  if (source.status === 'not_configured') {
    return 'Not configured';
  }

  if (typeof source.currentPowerW === 'number' && source.currentPowerW > 0) {
    return `${Math.round(source.currentPowerW)} W`;
  }

  if (typeof source.todayKWh === 'number') {
    return `${source.todayKWh.toFixed(1)} kWh`;
  }

  return 'Available';
}

function rangeLabel(range: EnergyRange) {
  if (range === 'now') return 'Now';
  if (range === 'today') return 'Today';
  if (range === 'week') return 'Week';
  return 'Month';
}

function buildOrbDots() {
  const dots: Array<{
    angle: number;
    id: string;
    opacity: number;
    size: number;
    x: number;
    y: number;
  }> = [];

  for (let ring = 0; ring < 5; ring += 1) {
    const radius = 76 + ring * 18;
    const count = 18 + ring * 8;
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      dots.push({
        angle,
        id: `${ring}:${index}`,
        opacity: 0.9 - ring * 0.12,
        size: 4 + (4 - ring) * 1.2,
        x: Math.cos(angle) * radius,
        y: Math.sin(angle) * radius,
      });
    }
  }

  return dots;
}

function getLoadOrbDotColor({
  angle,
  generatedColor,
  importColor,
  shares,
  trackedColor,
}: {
  angle: number;
  generatedColor: string;
  importColor: string;
  shares: LoadOrbShares;
  trackedColor: string;
}) {
  const progress = (angle + Math.PI) / (Math.PI * 2);

  if (progress <= shares.generated) {
    return generatedColor;
  }

  if (progress <= shares.generated + shares.imported) {
    return importColor;
  }

  if (shares.tracked > 0) {
    return trackedColor;
  }

  return importColor;
}

interface LoadOrbShares {
  generated: number;
  imported: number;
  tracked: number;
}

function getLoadOrbShares({
  generatedKWh,
  importedKWh,
  trackedKWh,
}: {
  generatedKWh: number;
  importedKWh: number;
  trackedKWh: number;
}): LoadOrbShares {
  const raw = {
    generated: Math.max(0, generatedKWh),
    imported: Math.max(0, importedKWh),
    tracked: Math.max(0, trackedKWh),
  };
  const total = raw.generated + raw.imported + raw.tracked;

  if (total <= 0) {
    return { generated: 0, imported: 1, tracked: 0 };
  }

  const presentEntries = Object.entries(raw).filter(([, value]) => value > 0) as Array<
    [keyof LoadOrbShares, number]
  >;
  const minVisibleShare = 0.08;
  const reserved = presentEntries.length * minVisibleShare;
  const remaining = Math.max(0, 1 - reserved);

  return presentEntries.reduce<LoadOrbShares>(
    (shares, [key, value]) => {
      shares[key] = minVisibleShare + (value / total) * remaining;
      return shares;
    },
    { generated: 0, imported: 0, tracked: 0 }
  );
}
