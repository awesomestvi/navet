import { Panel } from '@navet/app/components/primitives';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import { CloudSun, Droplets, type LucideIcon, Thermometer } from 'lucide-react';
import type { ClimateDashboardOverview } from '../utils/climate-dashboard-overview';

const blackThemeCardEdge = {
  borderColor: 'rgba(255,255,255,0.16)',
  boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.055)',
} as const;

interface ClimateComfortBannerProps {
  overview: ClimateDashboardOverview;
}

interface ClimateMetric {
  id: string;
  label: string;
  value: string;
  detail?: string;
  icon: LucideIcon;
  color: string;
}

export function ClimateComfortBanner({ overview }: ClimateComfortBannerProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const hasAttention = overview.attentionItems.length > 0;
  const statusColor = hasAttention ? themeColorValues.orange : accentColor;
  const progress =
    overview.comparableRoomCount > 0
      ? overview.comfortableRoomCount / overview.comparableRoomCount
      : 0;
  const roomRatio =
    overview.comparableRoomCount > 0
      ? `${overview.comfortableRoomCount}/${overview.comparableRoomCount}`
      : '—';
  const detailParts = [
    overview.activeControlCount > 0
      ? t('homeSummary.active', { count: overview.activeControlCount })
      : null,
    overview.attentionItems.length > 0
      ? t('security.summary.issues', { count: overview.attentionItems.length })
      : null,
  ].filter(Boolean);
  const roomDetail = `${roomRatio} ${
    overview.comparableRoomCount === 1 ? t('common.room') : t('dashboard.roomNav.openRooms')
  }`;
  const metrics: ClimateMetric[] = [];

  if (overview.temperatureRange) {
    metrics.push({
      id: 'temperature',
      label: t('sections.climate.temperature.title'),
      value: overview.temperatureRange,
      detail: `${overview.temperatureRoomCount} ${
        overview.temperatureRoomCount === 1 ? t('common.room') : t('dashboard.roomNav.openRooms')
      }`,
      icon: Thermometer,
      color: themeColorValues.orange,
    });
  }
  if (overview.averageHumidity !== null) {
    metrics.push({
      id: 'humidity',
      label: t('sections.climate.humidity.title'),
      value: `${overview.averageHumidity}%`,
      detail: `${overview.humidityRoomCount} ${
        overview.humidityRoomCount === 1 ? t('common.room') : t('dashboard.roomNav.openRooms')
      }`,
      icon: Droplets,
      color: themeColorValues.teal,
    });
  }
  if (overview.outdoorTemperature) {
    metrics.push({
      id: 'outdoor',
      label: t('weather.subtitle'),
      value: overview.outdoorTemperature,
      detail: overview.outdoorFeelsLike
        ? t('weather.feelsLike', { temp: overview.outdoorFeelsLike })
        : undefined,
      icon: CloudSun,
      color: themeColorValues.blue,
    });
  }

  const metricGridClass =
    metrics.length === 1
      ? 'sm:grid-cols-1 xl:grid-cols-[minmax(18rem,1.55fr)_minmax(0,0.85fr)]'
      : metrics.length === 2
        ? 'sm:grid-cols-2 xl:grid-cols-[minmax(18rem,1.55fr)_repeat(2,minmax(0,0.85fr))]'
        : 'sm:grid-cols-3 xl:grid-cols-[minmax(18rem,1.55fr)_repeat(3,minmax(0,0.85fr))]';

  return (
    <Panel
      as="section"
      padded={false}
      aria-label={t('homeSummary.climate')}
      className="relative overflow-hidden"
      style={theme === 'black' ? blackThemeCardEdge : undefined}
      data-climate-comfort-banner
    >
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0"
        style={{
          background: `radial-gradient(circle at 8% 0%, ${statusColor}18, transparent 34%), radial-gradient(circle at 88% 100%, ${themeColorValues.teal}0d, transparent 30%)`,
        }}
      />
      <div className={cn('relative grid grid-cols-1', metricGridClass)}>
        <div className="flex min-w-0 items-center gap-3 px-4 py-4 sm:gap-4 sm:px-5 xl:min-h-28 xl:px-6">
          <ComfortRing value={roomRatio} progress={progress} color={statusColor} />
          <div className="min-w-0">
            <h2 className={cn('text-sm font-semibold sm:text-base', surface.textPrimary)}>
              {hasAttention ? t('tasks.filters.attention') : t('dashboard.packs.section.comfort')}
            </h2>
            <p className={cn('mt-1 text-xs leading-relaxed', surface.textSecondary)}>
              {detailParts.length > 0 ? `${roomDetail} · ${detailParts.join(' · ')}` : roomDetail}
            </p>
          </div>
        </div>
        {metrics.map((metric) => (
          <ClimateMetricCell key={metric.id} metric={metric} />
        ))}
      </div>
    </Panel>
  );
}

function ComfortRing({
  value,
  progress,
  color,
}: {
  value: string;
  progress: number;
  color: string;
}) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const radius = 25;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="relative h-16 w-16 shrink-0" aria-hidden="true">
      <svg className="h-full w-full -rotate-90" viewBox="0 0 64 64">
        <title>{value}</title>
        <circle cx="32" cy="32" r={radius} fill="none" stroke={`${color}26`} strokeWidth="6" />
        <circle
          cx="32"
          cy="32"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={circumference * (1 - progress)}
        />
      </svg>
      <span
        className={cn(
          'absolute inset-0 flex items-center justify-center text-sm font-bold tabular-nums',
          surface.textPrimary
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ClimateMetricCell({ metric }: { metric: ClimateMetric }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const Icon = metric.icon;

  return (
    <section
      aria-label={`${metric.label}: ${metric.value}`}
      className={cn(
        'flex min-w-0 items-center gap-3 border-t px-4 py-4 sm:min-h-24 sm:border-l sm:px-5 xl:min-h-28 xl:border-t-0 xl:px-6',
        surface.dividerBorder
      )}
      data-climate-comfort-metric={metric.id}
    >
      <span
        className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full"
        style={{ color: metric.color, backgroundColor: `${metric.color}14` }}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className={cn('truncate text-[11px] leading-tight', surface.textSecondary)}>
          {metric.label}
        </p>
        <p className={cn('mt-1 truncate text-lg font-semibold tabular-nums', surface.textPrimary)}>
          {metric.value}
        </p>
        {metric.detail ? (
          <p className={cn('mt-0.5 truncate text-[11px] leading-tight', surface.textSecondary)}>
            {metric.detail}
          </p>
        ) : null}
      </div>
    </section>
  );
}
