import { useAuthBaseUrl } from '@navet/app/auth/AuthProvider';
import { DashboardHeroSection } from '@navet/app/components/patterns/dashboard-hero-section';
import { BaseCard } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { getCardSpanClass } from '@navet/app/components/shared/card-size-selector';
import { getLightCardSurfaceTokens } from '@navet/app/components/shared/theme/light-card-surface-tokens';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { useFitDashboardGrid } from '@navet/app/features/dashboard/hooks/use-fit-dashboard-grid';
import { useEnergyLoadHistory } from '@navet/app/features/energy/hooks/use-energy-load-history';
import type {
  EnergyConsumer,
  EnergyDashboardModel,
  EnergySeriesPoint,
  EnergySourceDiagnostic,
} from '@navet/app/features/energy/types/energy.types';
import {
  formatEnergyPercent,
  formatEnergyValue,
} from '@navet/app/features/energy/utils/energy-formatters';
import { useI18n, useTheme } from '@navet/app/hooks';
import { useBreakpointCols } from '@navet/app/hooks/use-breakpoint-cols';
import { useDeferredVisibility } from '@navet/app/hooks/use-deferred-visibility';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import { AlertTriangle, ExternalLink, Flame, Leaf, PlugZap, Sun, Zap } from 'lucide-react';
import { type CSSProperties, memo } from 'react';
import { EnergyNowCardView } from '../widgets/energy-now-card-view';

interface EnergyDashboardPageProps {
  dashboard: EnergyDashboardModel;
  sourceDiagnostics: EnergySourceDiagnostic[];
}
const heroLegendColors = {
  generated: themeColorValues.green,
  liveLoad: themeColorValues.teal,
  gridImport: themeColorValues.orange,
  trackedDevices: themeColorValues.blue,
};
const LOAD_ORB_DRIFT_BASE_DURATION_S = 8.5;
const LOAD_ORB_RIPPLE_KEYFRAMES = `
  @keyframes navet-load-orb-water-drift {
    0%, 100% {
      opacity: var(--load-orb-dot-opacity);
      transform:
        translate(-50%, -50%)
        translate(
          calc(var(--load-orb-dot-x) - var(--load-orb-drift-x)),
          calc(var(--load-orb-dot-y) - var(--load-orb-drift-y))
        )
        scale(0.97);
    }

    50% {
      opacity: calc(var(--load-orb-dot-opacity) * 0.9);
      transform:
        translate(-50%, -50%)
        translate(
          calc(var(--load-orb-dot-x) + var(--load-orb-drift-x)),
          calc(var(--load-orb-dot-y) + var(--load-orb-drift-y))
        )
        scale(1.03);
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .navet-load-orb-dot {
      animation: none !important;
      opacity: var(--load-orb-dot-opacity) !important;
      transform: translate(-50%, -50%) translate(var(--load-orb-dot-x), var(--load-orb-dot-y)) scale(1) !important;
    }
  }
`;

export const EnergyDashboardPage = memo(function EnergyDashboardPage({
  dashboard,
  sourceDiagnostics,
}: EnergyDashboardPageProps) {
  const { t } = useI18n();
  const haBaseUrl = useAuthBaseUrl();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const homeAssistantEnergyUrl = resolveHomeAssistantEnergyUrl(haBaseUrl);
  const liveWatts = Math.round(dashboard.totals.currentLoadW);
  const importedTodayLabel = `${formatEnergyValue(dashboard.totals.importTodayKWh)} kWh`;
  const generatedTodayLabel = `${formatEnergyValue(dashboard.totals.solarTodayKWh)} kWh`;
  return (
    <div className="space-y-5">
      <DashboardHeroSection
        accentColor={accentColor}
        description={`Track live demand, compare ${formatEnergyValue(dashboard.totals.importTodayKWh)} kWh imported with ${formatEnergyValue(dashboard.totals.exportTodayKWh)} kWh exported, and see how HA Energy devices divide today's usage.`}
        surface={surface}
        title={t('energy.hero.title')}
      />

      <section className="grid gap-5 xl:grid-cols-[minmax(22rem,26rem)_minmax(0,1fr)]">
        <div className="order-2 min-w-0 self-start xl:order-1">
          <SourceDiagnostics
            accentColor={accentColor}
            homeAssistantEnergyUrl={homeAssistantEnergyUrl}
            openLabel={t('common.open')}
            sources={sourceDiagnostics}
            surface={surface}
          />
        </div>

        <div className="order-1 min-w-0 self-start xl:order-2">
          <DeviceTable
            accentColor={accentColor}
            consumers={dashboard.topConsumers}
            generatedColor={heroLegendColors.generated}
            generatedTodayKWh={dashboard.totals.exportTodayKWh}
            gridImportTodayKWh={dashboard.totals.importTodayKWh}
            importColor={heroLegendColors.gridImport}
            loadW={liveWatts}
            importedTodayLabel={importedTodayLabel}
            generatedTodayLabel={generatedTodayLabel}
            sourceDiagnostics={sourceDiagnostics}
            surface={surface}
          />
        </div>
      </section>

      <section>
        <CompactLoadSparklines
          accentColor={accentColor}
          consumers={dashboard.topConsumers}
          surface={surface}
          wholeHomeCurrentW={dashboard.totals.currentLoadW}
          wholeHomePoints={dashboard.ranges[dashboard.selectedRange].liveConsumption}
          wholeHomeTodayKWh={dashboard.ranges[dashboard.selectedRange].totalUsageKWh}
        />
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
  const breakpointCols = useBreakpointCols();
  const { ref: viewportRef, isVisible } = useDeferredVisibility<HTMLDivElement>({
    rootMargin: '180px 0px',
  });
  const { outerRef, innerRef, outerContainerStyle, innerContainerStyle, isAutoScaled, gridStyle } =
    useFitDashboardGrid(breakpointCols);

  return (
    <div ref={viewportRef}>
      <div className="mb-3 flex items-center gap-3">
        <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>Sparklines</h2>
        <div className={`h-px flex-1 ${surface.borderStrong}`} />
      </div>

      <div ref={outerRef} className="relative w-full" style={outerContainerStyle}>
        <div
          ref={innerRef}
          className={`w-full${isAutoScaled ? ' absolute left-0 top-0 origin-top-left' : ''}`}
          style={innerContainerStyle}
        >
          <div
            className="grid w-full grid-flow-row-dense gap-3 lg:gap-4"
            style={gridStyle as CSSProperties}
          >
            <div className={`${getCardSpanClass('medium')} min-w-0`}>
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
              <DeviceSparklineRow
                key={consumer.id}
                accentColor={accentColor}
                consumer={consumer}
                enabled={isVisible}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function DeviceSparklineRow({
  accentColor,
  consumer,
  enabled,
}: {
  accentColor: string;
  consumer: EnergyConsumer;
  enabled: boolean;
}) {
  const points = useEnergyLoadHistory(consumer.powerEntityId, consumer.powerW, enabled);

  return (
    <div className={`${getCardSpanClass('medium')} min-w-0`}>
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
  consumers,
  generatedColor,
  generatedTodayKWh,
  importColor,
  loadW,
  todayKWh,
  surface,
}: {
  consumers: EnergyConsumer[];
  generatedColor: string;
  generatedTodayKWh: number;
  importColor: string;
  loadW: number;
  todayKWh: number;
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const motionIntensity = getLoadOrbMotionIntensity(loadW);
  const dots = buildOrbDots(motionIntensity);
  const orbSegments = getLoadOrbSegments({
    consumers,
    exportedKWh: generatedTodayKWh,
    importedKWh: todayKWh,
  });

  return (
    <div className="relative flex min-h-[24rem] min-w-0 items-center justify-center overflow-visible px-2 py-4">
      <style>{LOAD_ORB_RIPPLE_KEYFRAMES}</style>
      <div className="absolute inset-0" aria-hidden="true">
        {dots.map((dot) => (
          <span
            key={dot.id}
            className="navet-load-orb-dot absolute rounded-full"
            data-ring={dot.ring}
            data-testid="load-orb-dot"
            style={{
              ['--load-orb-dot-opacity' as string]: String(dot.opacity),
              ['--load-orb-dot-x' as string]: `${dot.x}px`,
              ['--load-orb-dot-y' as string]: `${dot.y}px`,
              ['--load-orb-drift-x' as string]: `${dot.driftX}px`,
              ['--load-orb-drift-y' as string]: `${dot.driftY}px`,
              animationDelay: `${dot.delayS}s`,
              animationDuration: `${dot.durationS}s`,
              animationIterationCount: 'infinite',
              animationName: 'navet-load-orb-water-drift',
              animationTimingFunction: 'ease-in-out',
              backgroundColor: getLoadOrbDotColor({
                angle: dot.angle,
                generatedColor,
                importColor,
                segments: orbSegments,
              }),
              height: dot.size,
              left: '50%',
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: dot.size,
            }}
          />
        ))}
      </div>
      <div className="relative z-10 flex flex-col items-center justify-center text-center">
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
  generatedColor,
  generatedTodayKWh,
  gridImportTodayKWh,
  importColor,
  importedTodayLabel,
  loadW,
  generatedTodayLabel,
  sourceDiagnostics,
  surface,
}: {
  accentColor: string;
  consumers: EnergyConsumer[];
  generatedColor: string;
  generatedTodayKWh: number;
  gridImportTodayKWh: number;
  importColor: string;
  importedTodayLabel: string;
  loadW: number;
  generatedTodayLabel: string;
  sourceDiagnostics: EnergySourceDiagnostic[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const dashboardSpaceMode = useSettingsStore(settingsSelectors.dashboardSpaceMode);
  const unavailableDevices = getUnavailableDeviceDiagnostics(consumers, sourceDiagnostics);
  const useSplitOrbLayout = dashboardSpaceMode === 'more_space';
  const contentLayoutClassName = useSplitOrbLayout
    ? 'grid gap-8 p-5 lg:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]'
    : 'grid gap-8 p-5 2xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]';
  const tableOrderClassName = useSplitOrbLayout
    ? 'order-2 flex min-w-0 flex-col lg:order-1'
    : 'order-2 flex min-w-0 flex-col 2xl:order-1';
  const orbPaneClassName = useSplitOrbLayout
    ? `order-1 min-w-0 border-b pb-5 lg:order-2 lg:border-b-0 lg:border-t-0 lg:border-l lg:pb-0 lg:pt-0 lg:pl-6 ${surface.border}`
    : `order-1 min-w-0 border-b pb-5 2xl:order-2 2xl:border-b-0 2xl:border-t-0 2xl:border-l 2xl:pb-0 2xl:pt-0 2xl:pl-6 ${surface.border}`;

  return (
    <BaseCard size="medium" fullBleed className="min-w-0 w-full" surfaceVariant="muted">
      <div
        data-testid="energy-live-layout"
        data-space-mode={dashboardSpaceMode}
        className={contentLayoutClassName}
      >
        <div className={tableOrderClassName}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <div className={`text-xs ${surface.textMuted}`}>Tracked by HA Energy</div>
              <h2 className={`text-lg font-semibold ${surface.textPrimary}`}>Live Energy</h2>
              <p className={`mt-1 max-w-xl text-sm ${surface.textMuted}`}>
                Imported energy is split by tracked devices while export remains visible as a
                separate source.
              </p>
            </div>
          </div>
          <div className="mb-4 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
            <MinimalStat
              label="Imported today"
              value={importedTodayLabel}
              dotColor={heroLegendColors.gridImport}
              className="min-w-[12.5rem]"
              surfaceText={surface.textSecondary}
            />
            {generatedTodayKWh > 0 ? (
              <MinimalStat
                label="Generated today"
                value={generatedTodayLabel}
                dotColor={heroLegendColors.generated}
                className="min-w-[13rem]"
                surfaceText={surface.textSecondary}
              />
            ) : null}
          </div>
          <div
            className={`min-h-0 flex-1 overflow-hidden rounded-[22px] border ${surface.border} ${surface.panelMuted}`}
          >
            {consumers.length === 0 ? (
              <div className={`px-4 py-5 text-sm ${surface.textMuted}`}>
                No available device usage has been reported yet.
              </div>
            ) : (
              <>
                <div
                  className={`hidden grid-cols-[minmax(0,1fr)_5rem_5rem_4rem] items-center gap-3 px-4 pt-3 pb-2 text-xs font-medium sm:grid ${surface.textMuted}`}
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
                        <div className="flex min-w-0 items-center gap-2">
                          <span
                            aria-hidden="true"
                            className="h-2.5 w-2.5 shrink-0 rounded-full"
                            style={{ backgroundColor: getEnergyConsumerColor(consumer) }}
                          />
                          <div className={`truncate font-medium ${surface.textPrimary}`}>
                            {consumer.name}
                          </div>
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
                        <div className={`text-xs font-medium sm:hidden ${surface.textMuted}`}>
                          Now
                        </div>
                        <div className={`font-medium sm:text-right ${surface.textPrimary}`}>
                          {formatPowerValue(consumer.powerW)}
                        </div>
                      </div>
                      <div className="min-w-0">
                        <div className={`text-xs font-medium sm:hidden ${surface.textMuted}`}>
                          Today
                        </div>
                        <div className={`sm:text-right ${surface.textSecondary}`}>
                          {formatTrackedEnergyValue(consumer.energyKWh)}
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
                    <div className={`hidden text-right text-sm sm:block ${surface.textMuted}`}>
                      -
                    </div>
                    <div className={`text-xs font-medium sm:text-right ${surface.textMuted}`}>
                      Unavailable
                    </div>
                  </div>
                ))}
              </div>
            ) : null}
          </div>
          <div
            className={`mt-4 flex items-start gap-2 border-t pt-3 text-xs leading-relaxed ${surface.border} ${surface.textMuted}`}
          >
            <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
            <p>Wrong sensors or missing sources should be corrected in Home Assistant Energy.</p>
          </div>
        </div>

        <div className={orbPaneClassName}>
          <div className="mb-4">
            <div className={`text-xs ${surface.textMuted}`}>Orb mix</div>
            <h3 className={`text-base font-semibold ${surface.textPrimary}`}>Import Attribution</h3>
            <p className={`mt-1 text-sm ${surface.textMuted}`}>
              Orange shows import that is still unattributed, green shows export, and each device
              color marks tracked import usage.
            </p>
          </div>
          <div className="mx-auto flex max-w-[24rem] justify-center">
            <LoadOrb
              consumers={consumers}
              generatedColor={generatedColor}
              generatedTodayKWh={generatedTodayKWh}
              loadW={loadW}
              todayKWh={gridImportTodayKWh}
              importColor={importColor}
              surface={surface}
            />
          </div>
        </div>
      </div>
    </BaseCard>
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
      : `Idle · ${formatTrackedEnergyValue(consumer.energyKWh)} today`;
  }

  return 'Idle · no live draw';
}

function formatPowerValue(powerW: number) {
  return `${Math.round(powerW)} W`;
}

function formatTrackedEnergyValue(energyKWh: number) {
  if (energyKWh > 0 && energyKWh < 1) {
    return `${Math.round(energyKWh * 1000)} Wh`;
  }

  return `${formatEnergyValue(energyKWh)} kWh`;
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
  homeAssistantEnergyUrl,
  openLabel,
  sources,
  surface,
}: {
  accentColor: string;
  homeAssistantEnergyUrl: string | null;
  openLabel: string;
  sources: EnergySourceDiagnostic[];
  surface: ReturnType<typeof getThemeSurfaceTokens>;
}) {
  const { theme, colors } = useTheme();
  const sourceRows = getSourceDiagnostics(sources);
  const accentSurface = getLightCardSurfaceTokens({
    isOn: true,
    selectedColor: null,
    currentColor: null,
    theme,
    lightColors: colors.light,
    accentColor,
  });
  const rowDividerClassName = theme === 'light' ? 'border-slate-200/80' : 'border-white/8';

  return (
    <BaseCard
      data-testid="energy-sources-card"
      size="medium"
      title="Sources"
      subtitle="Manage source selection in Home Assistant Energy"
      accentColor={accentColor}
      headerLeading={
        <EntityCardHeaderIcon
          IconComponent={Zap}
          isActive
          size="medium"
          tone="primary"
          baseColor={accentColor}
        />
      }
      headerTrailing={
        homeAssistantEnergyUrl ? (
          <a
            href={homeAssistantEnergyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${
              theme === 'light' ? 'bg-white/88 hover:bg-white' : 'bg-black/18 hover:bg-black/24'
            }`}
            style={{
              borderColor: `${accentColor}${theme === 'light' ? '33' : '29'}`,
              color: accentColor,
            }}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{openLabel}</span>
          </a>
        ) : null
      }
      frameClassName={accentSurface.cardClassName}
      style={accentSurface.cardStyle}
      disableDefaultSheen
      overlay={
        <>
          {accentSurface.activeGlowClassName ? (
            <div
              className={accentSurface.activeGlowClassName}
              style={accentSurface.activeGlowStyle}
            />
          ) : null}
          {accentSurface.innerOverlayClassName ? (
            <div
              className={accentSurface.innerOverlayClassName}
              style={accentSurface.innerOverlayStyle}
            />
          ) : null}
          {accentSurface.shineOverlayClassName ? (
            <div className={accentSurface.shineOverlayClassName} />
          ) : null}
        </>
      }
      className="w-full"
      contentClassName="flex flex-col"
      headerClassName="pb-1"
    >
      <div className="grid gap-2 overflow-hidden">
        {sourceRows.map((source) => (
          <div
            key={source.id}
            className={`flex min-w-0 items-center justify-between gap-3 border-t pt-2 first:border-t-0 first:pt-0 text-sm ${rowDividerClassName}`}
          >
            <div className="flex min-w-0 items-center gap-2">
              <SourceIcon source={source} accentColor={accentColor} />
              <div className="min-w-0">
                <div className={`truncate font-medium ${surface.textPrimary}`}>{source.label}</div>
                <div className={`truncate text-xs ${surface.textMuted}`}>
                  {source.entityId ?? source.liveEntityId}
                </div>
              </div>
            </div>
            <div
              className={`shrink-0 text-right text-xs font-medium ${
                source.status === 'configured_unavailable'
                  ? theme === 'light'
                    ? 'text-amber-700'
                    : 'text-amber-200'
                  : surface.textSecondary
              }`}
            >
              {formatDiagnosticStatus(source)}
            </div>
          </div>
        ))}
      </div>
    </BaseCard>
  );
}

function SourceIcon({
  accentColor,
  source,
}: {
  accentColor: string;
  source: EnergySourceDiagnostic;
}) {
  const { theme } = useTheme();
  const iconWrapClassName =
    source.status === 'configured_unavailable'
      ? theme === 'light'
        ? 'bg-amber-100'
        : 'bg-amber-300/16'
      : source.id === 'grid-import'
        ? theme === 'light'
          ? 'bg-orange-100'
          : 'bg-orange-400/16'
        : source.id === 'grid-export'
          ? theme === 'light'
            ? 'bg-amber-100'
            : 'bg-amber-300/16'
          : source.id === 'solar'
            ? theme === 'light'
              ? 'bg-yellow-100'
              : 'bg-yellow-300/16'
            : source.id === 'gas'
              ? theme === 'light'
                ? 'bg-red-100'
                : 'bg-red-400/16'
              : theme === 'light'
                ? 'bg-emerald-100'
                : 'bg-emerald-400/16';

  const iconClassName = 'h-3.5 w-3.5 shrink-0';
  const iconNode =
    source.status === 'configured_unavailable' ? (
      <AlertTriangle
        className={`${iconClassName} ${theme === 'light' ? 'text-amber-700' : 'text-amber-200'}`}
      />
    ) : source.id === 'grid-import' ? (
      <Zap className={iconClassName} style={{ color: accentColor }} />
    ) : source.id === 'grid-export' ? (
      <PlugZap
        className={`${iconClassName} ${theme === 'light' ? 'text-amber-700' : 'text-amber-200'}`}
      />
    ) : source.id === 'solar' ? (
      <Sun className={iconClassName} style={{ color: themeColorValues.yellow }} />
    ) : source.id === 'gas' ? (
      <Flame className={iconClassName} style={{ color: themeColorValues.red }} />
    ) : (
      <Leaf className={iconClassName} style={{ color: themeColorValues.green }} />
    );

  return (
    <div
      className={`flex h-7 w-7 shrink-0 items-center justify-center rounded-full ${iconWrapClassName}`}
    >
      {iconNode}
    </div>
  );
}

function getSourceDiagnostics(sourceDiagnostics: EnergySourceDiagnostic[]) {
  return sourceDiagnostics.filter((source) => !source.id.startsWith('device:'));
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

function resolveHomeAssistantEnergyUrl(haBaseUrl: string | null): string | null {
  const energyPath = '/config/energy/dashboard';

  if (haBaseUrl) {
    try {
      return new URL(energyPath, haBaseUrl).toString();
    } catch {
      return energyPath;
    }
  }

  if (typeof window !== 'undefined' && window.location.pathname.includes('/api/hassio_ingress/')) {
    return energyPath;
  }

  return null;
}

function getLoadOrbMotionIntensity(loadW: number) {
  return Math.max(0.7, Math.min(1.9, 0.82 + loadW / 2200));
}

function buildOrbDots(motionIntensity = 1) {
  const dots: Array<{
    angle: number;
    delayS: number;
    driftX: number;
    driftY: number;
    durationS: number;
    id: string;
    opacity: number;
    ring: number;
    size: number;
    x: number;
    y: number;
  }> = [];
  const spokeCount = 26;

  for (let ring = 0; ring < 5; ring += 1) {
    const radius = 84 + ring * 21;
    const driftAmplitude = Math.max(1.4, 2.3 - ring * 0.18) * motionIntensity;
    const durationScale = Math.max(0.62, 1.18 - (motionIntensity - 0.7) * 0.28);
    for (let index = 0; index < spokeCount; index += 1) {
      const angle = (index / spokeCount) * Math.PI * 2 - Math.PI / 2;
      const durationBase = LOAD_ORB_DRIFT_BASE_DURATION_S + ring * 0.4 + (index % 4) * 0.18;
      dots.push({
        angle,
        delayS: -((index / spokeCount) * durationBase * durationScale),
        driftX: Math.cos(angle) * driftAmplitude,
        driftY: Math.sin(angle) * driftAmplitude,
        durationS: durationBase * durationScale,
        id: `${ring}:${index}`,
        opacity: 0.92 - ring * 0.08,
        ring,
        size: 6.2 + (4 - ring) * 0.7,
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
  segments,
}: {
  angle: number;
  generatedColor: string;
  importColor: string;
  segments: LoadOrbSegment[];
}) {
  const progress = (angle + Math.PI) / (Math.PI * 2);

  for (const segment of segments) {
    if (progress <= segment.end) {
      if (segment.kind === 'export') {
        return generatedColor;
      }
      if (segment.kind === 'import') {
        return importColor;
      }
      return segment.color;
    }
  }

  return importColor;
}

interface LoadOrbSegment {
  color: string;
  end: number;
  kind: 'device' | 'export' | 'import';
  start: number;
}

function getLoadOrbSegments({
  consumers,
  exportedKWh,
  importedKWh,
}: {
  consumers: EnergyConsumer[];
  exportedKWh: number;
  importedKWh: number;
}): LoadOrbSegment[] {
  const exported = Math.max(0, exportedKWh);
  const imported = Math.max(0, importedKWh);
  const trackedConsumers = consumers
    .filter((consumer) => consumer.energyKWh > 0)
    .sort((left, right) => right.energyKWh - left.energyKWh);
  const trackedTotal = trackedConsumers.reduce((sum, consumer) => sum + consumer.energyKWh, 0);
  const deviceTracked = Math.min(trackedTotal, imported);
  const remainingImport = Math.max(0, imported - deviceTracked);
  const total = exported + remainingImport + deviceTracked;

  if (total <= 0) {
    return [{ kind: 'import', color: '', start: 0, end: 1 }];
  }

  const segmentInputs: Array<{
    color: string;
    kind: LoadOrbSegment['kind'];
    value: number;
  }> = [];

  if (exported > 0) {
    segmentInputs.push({ kind: 'export', color: '', value: exported });
  }

  if (remainingImport > 0) {
    segmentInputs.push({ kind: 'import', color: '', value: remainingImport });
  }

  const trackedScale = trackedTotal > 0 ? deviceTracked / trackedTotal : 0;
  for (const consumer of trackedConsumers) {
    const value = consumer.energyKWh * trackedScale;
    if (value <= 0) {
      continue;
    }
    segmentInputs.push({
      kind: 'device',
      color: getEnergyConsumerColor(consumer),
      value,
    });
  }

  const minVisibleShare = 0.035;
  const reserved = segmentInputs.length * minVisibleShare;
  const flexible = Math.max(0, 1 - reserved);
  let cursor = 0;

  return segmentInputs.map((segment) => {
    const share = minVisibleShare + (segment.value / total) * flexible;
    const start = cursor;
    cursor += share;
    return {
      color: segment.color,
      kind: segment.kind,
      start,
      end: Math.min(1, cursor),
    };
  });
}

function getEnergyConsumerColor(consumer: EnergyConsumer) {
  const seed = `${consumer.id}:${consumer.name}`;
  let hash = 0;
  for (let index = 0; index < seed.length; index += 1) {
    hash = (hash * 31 + seed.charCodeAt(index)) >>> 0;
  }
  const palette = [
    '#60a5fa',
    '#a78bfa',
    '#f472b6',
    '#38bdf8',
    '#e879f9',
    '#fb7185',
    '#818cf8',
    '#22d3ee',
    '#c084fc',
    '#f9a8d4',
  ] as const;
  return palette[hash % palette.length];
}
