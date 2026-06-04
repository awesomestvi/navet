import { useAuthBaseUrl } from '@navet/app/auth/AuthProvider';
import { BaseCard } from '@navet/app/components/primitives';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
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
import { AlertTriangle, ExternalLink, Flame, Leaf, PlugZap, Sun, Zap } from 'lucide-react';
import { memo } from 'react';
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
  const trackedKWh = dashboard.topConsumers.reduce((sum, consumer) => sum + consumer.energyKWh, 0);
  const unavailableDeviceCount = getUnavailableDeviceDiagnostics(
    dashboard.topConsumers,
    sourceDiagnostics
  ).length;
  const trackedDeviceCount = dashboard.topConsumers.length + unavailableDeviceCount;
  return (
    <div className="space-y-5">
      <section
        className={`overflow-hidden rounded-[28px] border ${surface.border} ${surface.panel} ${surface.cardShadow}`}
      >
        <div className="grid min-h-[28rem] gap-8 p-5 md:p-8 xl:grid-cols-[minmax(0,1fr)_minmax(22rem,26rem)]">
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
              <div
                className={`mt-4 flex items-start gap-2 text-xs leading-relaxed ${surface.textMuted}`}
              >
                <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                <p>
                  Wrong sensors or missing sources should be corrected in Home Assistant Energy.
                </p>
              </div>
            </div>
          </div>

          <div className="grid min-w-0 gap-6 content-start pt-6 md:pt-10">
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

      <section className="grid gap-5 xl:grid-cols-4">
        <div className="xl:col-span-3">
          <CompactLoadSparklines
            accentColor={accentColor}
            consumers={dashboard.topConsumers}
            surface={surface}
            wholeHomeCurrentW={dashboard.totals.currentLoadW}
            wholeHomePoints={dashboard.ranges[dashboard.selectedRange].liveConsumption}
            wholeHomeTodayKWh={dashboard.ranges[dashboard.selectedRange].totalUsageKWh}
          />
        </div>
        <div className="xl:col-span-1">
          <div className="mb-3 flex items-center gap-3">
            <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>
              All Energy
            </h2>
            <div className={`h-px flex-1 ${surface.borderStrong}`} />
          </div>
          <div className="h-52 min-w-0">
            <SourceDiagnostics
              accentColor={accentColor}
              homeAssistantEnergyUrl={homeAssistantEnergyUrl}
              openLabel={t('common.open')}
              sources={sourceDiagnostics}
              surface={surface}
            />
          </div>
        </div>
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
    <div>
      <div className="mb-3 flex items-center gap-3">
        <h2 className={`text-lg font-semibold md:text-xl ${surface.textPrimary}`}>Sparklines</h2>
        <div className={`h-px flex-1 ${surface.borderStrong}`} />
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
    </div>
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
  const motionIntensity = getLoadOrbMotionIntensity(loadW);
  const dots = buildOrbDots(motionIntensity);
  const orbShares = getLoadOrbShares({
    generatedKWh: generatedTodayKWh,
    importedKWh: todayKWh,
    trackedKWh: trackedTodayKWh,
  });

  return (
    <div className="relative flex min-h-[22rem] min-w-0 items-center justify-center overflow-hidden">
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
                shares: orbShares,
                trackedColor,
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
      <div
        className={`relative flex h-44 w-44 flex-col items-center justify-center rounded-full border ${surface.border} ${surface.panel}`}
      >
        <div className={`text-5xl font-semibold tracking-tight ${surface.textPrimary}`}>
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
    <section
      className={`min-w-0 rounded-[24px] border p-5 ${surface.border} ${surface.panelMuted}`}
    >
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
  const sourceRows = getSourceDiagnostics(sources);

  return (
    <BaseCard
      size="medium"
      title="Sources"
      subtitle="Manage source selection in Home Assistant Energy"
      headerLeading={
        <EntityCardHeaderIcon IconComponent={Zap} isActive size="medium" baseColor={accentColor} />
      }
      headerTrailing={
        homeAssistantEnergyUrl ? (
          <a
            href={homeAssistantEnergyUrl}
            target="_blank"
            rel="noopener noreferrer"
            className={`inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium transition-colors ${surface.border} ${surface.subtleBg} ${surface.hoverBg} ${surface.textSecondary}`}
          >
            <ExternalLink className="h-3.5 w-3.5" />
            <span>{openLabel}</span>
          </a>
        ) : null
      }
      surfaceVariant="muted"
      className="h-full w-full"
      contentClassName="flex h-full flex-col"
      headerClassName="pb-1"
    >
      <div className="mt-auto grid gap-2 overflow-hidden">
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

  for (let ring = 0; ring < 5; ring += 1) {
    const radius = 104 + ring * 18;
    const count = 18 + ring * 8;
    const driftAmplitude = Math.max(1.9, 3.4 - ring * 0.32) * motionIntensity;
    const durationScale = Math.max(0.62, 1.18 - (motionIntensity - 0.7) * 0.28);
    for (let index = 0; index < count; index += 1) {
      const angle = (index / count) * Math.PI * 2 - Math.PI / 2;
      const durationBase = LOAD_ORB_DRIFT_BASE_DURATION_S + ring * 0.55 + (index % 5) * 0.22;
      dots.push({
        angle,
        delayS: -((index / count) * durationBase * durationScale),
        driftX: Math.cos(angle + ring * 0.7) * driftAmplitude,
        driftY: Math.sin(angle - ring * 0.55) * driftAmplitude * 0.92,
        durationS: durationBase * durationScale,
        id: `${ring}:${index}`,
        opacity: 0.9 - ring * 0.12,
        ring,
        size: 5 + (4 - ring) * 1.4,
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
