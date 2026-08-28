import { Panel } from '@navet/app/components/primitives';
import { themeColorValues } from '@navet/app/components/shared/theme/theme-colors';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import {
  CloudSun,
  Droplets,
  House,
  type LucideIcon,
  Thermometer,
  TriangleAlert,
} from 'lucide-react';
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
  const hasCritical = overview.attentionItems.some((item) => item.priority === 'critical');
  const statusColor = hasCritical
    ? themeColorValues.red
    : hasAttention
      ? themeColorValues.orange
      : accentColor;
  const StatusIcon = hasAttention ? TriangleAlert : House;
  const primaryAttention = overview.attentionItems[0];
  const detailParts = [
    primaryAttention ? `${primaryAttention.title} · ${primaryAttention.detail}` : null,
    overview.activeControlCount > 0
      ? t('homeSummary.active', { count: overview.activeControlCount })
      : null,
  ].filter(Boolean);
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
      ? 'grid-cols-1'
      : metrics.length === 2
        ? 'grid-cols-1 sm:grid-cols-2'
        : 'grid-cols-1 sm:grid-cols-3';

  return (
    <Panel
      as="section"
      aria-label={t('homeSummary.climate')}
      className="relative overflow-hidden p-3"
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
      <div className="relative lg:landscape:flex lg:landscape:items-center xl:flex xl:items-center">
        <div className="flex min-w-0 items-center gap-2.5 sm:pb-3 lg:landscape:order-1 lg:landscape:mr-2 lg:landscape:pb-0 xl:order-1 xl:mr-3 xl:pb-0">
          <span
            className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full border xl:h-9 xl:w-9"
            style={{
              color: statusColor,
              borderColor: `${statusColor}38`,
              backgroundColor: `${statusColor}14`,
            }}
            aria-hidden="true"
          >
            <StatusIcon className="h-4 w-4" />
          </span>
          <div className="min-w-0">
            <h2 className={cn('truncate text-sm font-semibold leading-tight', surface.textPrimary)}>
              {hasAttention ? t('tasks.filters.attention') : t('climate.comfort.mostlyComfortable')}
            </h2>
            {detailParts.length > 0 ? (
              <p className={cn('mt-0.5 truncate text-[11px] leading-tight', surface.textSecondary)}>
                {detailParts.join(' · ')}
              </p>
            ) : null}
          </div>
        </div>
        <div
          className={cn(
            '-mx-3 -mb-3 hidden sm:grid lg:landscape:contents xl:contents',
            metricGridClass
          )}
        >
          {metrics.map((metric, index) => (
            <ClimateMetricCell key={metric.id} metric={metric} index={index} />
          ))}
        </div>
      </div>
    </Panel>
  );
}

function ClimateMetricCell({ metric, index }: { metric: ClimateMetric; index: number }) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const Icon = metric.icon;
  const supportingText = metric.detail ? `${metric.label} · ${metric.detail}` : metric.label;

  return (
    <section
      aria-label={`${metric.label}: ${metric.value}`}
      className={cn(
        'flex min-h-14 min-w-0 items-center gap-2 border-t border-current/10 px-3 py-3.5 sm:px-4 md:px-5',
        index > 0 && 'sm:border-l',
        'lg:landscape:order-2 lg:landscape:min-h-0 lg:landscape:w-auto lg:landscape:flex-none lg:landscape:border-0 lg:landscape:px-4 lg:landscape:py-0 xl:order-2 xl:min-h-0 xl:w-auto xl:flex-none xl:border-0 xl:px-5 xl:py-0',
        index === 0 && 'lg:landscape:ml-auto xl:ml-auto',
        index > 0 && 'lg:landscape:border-l xl:border-l'
      )}
      data-climate-comfort-metric={metric.id}
    >
      <span
        className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full xl:h-9 xl:w-9"
        style={{ color: metric.color, backgroundColor: `${metric.color}14` }}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </span>
      <div className="min-w-0">
        <p className={cn('truncate text-sm font-semibold tabular-nums', surface.textPrimary)}>
          {metric.value}
        </p>
        <p className={cn('mt-0.5 truncate text-[11px] leading-tight', surface.textSecondary)}>
          {supportingText}
        </p>
      </div>
    </section>
  );
}
