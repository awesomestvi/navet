import { BaseCard, CardMetric } from '@navet/app/components/primitives';
import { EntityCardHeader } from '@navet/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@navet/app/components/primitives/entity-card-header-icon';
import type { CardSize } from '@navet/app/components/shared/card-size-selector';
import { getCardStateSurfaceTokens } from '@navet/app/components/shared/theme/card-state-surface-tokens';
import { getCustomCardTintSurface } from '@navet/app/components/shared/theme/custom-card-tint-surface';
import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import type { EnergySeriesPoint } from '@navet/app/features/energy/types/energy.types';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Zap } from 'lucide-react';
import { memo } from 'react';
import { EnergySparkline } from '../charts/energy-sparkline';
import { EnergyNowGradientOverlays } from './energy-now-gradient-overlays';

interface EnergyNowCardViewProps {
  title: string;
  subtitle?: string;
  currentLoadW: number;
  todayUsageKWh: number;
  trend: EnergySeriesPoint[];
  accentColor: string;
  size?: CardSize;
  tintColor?: string;
}

export const EnergyNowCardView = memo(function EnergyNowCardView({
  title,
  subtitle = 'Energy',
  currentLoadW,
  todayUsageKWh,
  trend,
  accentColor,
  size = 'medium',
  tintColor,
}: EnergyNowCardViewProps) {
  const { theme } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const stateSurface = getCardStateSurfaceTokens(theme, false);
  const tintSurface = getCustomCardTintSurface(theme, tintColor);
  const isSmall = size === 'small';
  const isMedium = size === 'medium';
  const hasSparklineData = trend.length >= 2;
  const headerSize: CardSize = isSmall ? 'small' : size;
  const tickIndexes = isSmall
    ? [0, trend.length - 1]
    : isMedium
      ? [0, Math.floor((trend.length - 1) / 2), trend.length - 1]
      : [
          0,
          Math.floor((trend.length - 1) / 3),
          Math.floor(((trend.length - 1) * 2) / 3),
          trend.length - 1,
        ];
  const trendTicks = trend.filter((_, index) => tickIndexes.includes(index));

  return (
    <BaseCard
      size={size}
      fullBleed
      className="transition-all duration-500"
      style={tintSurface.panelStyle}
      frameClassName="overflow-hidden"
      overlay={
        <>
          {tintSurface.glowStyle ? (
            <div className="pointer-events-none absolute inset-0" style={tintSurface.glowStyle} />
          ) : null}
          {tintSurface.overlayClassName ? (
            <div
              className={`pointer-events-none absolute inset-0 ${tintSurface.overlayClassName}`}
            />
          ) : null}
        </>
      }
      contentClassName="h-full"
    >
      {tintSurface.glowStyle ? (
        <div className="pointer-events-none absolute inset-0" style={tintSurface.glowStyle} />
      ) : null}

      <div className={`absolute inset-x-0 ${isSmall ? 'top-16 bottom-0' : 'top-20 bottom-0'}`}>
        {hasSparklineData ? (
          <EnergySparkline
            data={trend.map((point) => ({
              value: point.value,
              timestampMs: point.timestampMs,
              endTimestampMs: point.endTimestampMs,
              minValue: point.minValue,
              maxValue: point.maxValue,
            }))}
            accentColor={accentColor}
            height={isSmall ? 126 : isMedium ? 152 : 176}
            className="h-full w-full opacity-95"
            padX={0}
          />
        ) : (
          <div className="flex h-full items-center justify-center px-4">
            <div
              className={`rounded-2xl border border-dashed px-4 py-3 text-center text-sm ${surface.border} ${surface.textMuted}`}
            >
              {t('widgets.energyNow.empty.sparkline')}
            </div>
          </div>
        )}
      </div>

      <EnergyNowGradientOverlays theme={theme} isSmall={isSmall} />

      {hasSparklineData ? (
        <div
          className={`pointer-events-none absolute inset-x-0 border-t border-dashed ${theme === 'light' ? 'border-slate-400/70' : 'border-white/65'} ${isSmall ? 'top-[48%]' : 'top-[45%]'}`}
        />
      ) : null}

      <div className="pointer-events-none relative z-10 flex h-full flex-col p-3">
        <div className="flex items-start justify-between gap-4">
          {isSmall ? (
            <div />
          ) : (
            <EntityCardHeader
              title={title}
              subtitle={subtitle}
              size={headerSize}
              layout="eyebrow-first"
              className="mb-0"
              marginBottomClassName="mb-0"
              titleClassName={stateSurface.primaryTextClassName}
              subtitleClassName={stateSurface.mutedTextClassName}
              leading={
                <EntityCardHeaderIcon
                  IconComponent={Zap}
                  isActive
                  size={headerSize}
                  baseColor={accentColor}
                />
              }
            />
          )}
          <CardMetric
            value={`${Math.round(currentLoadW)}W`}
            label={`${todayUsageKWh.toFixed(1)} kWh`}
            size={isSmall ? 'sm' : isMedium ? 'lg' : 'xl'}
            isActive
            accentClassName={surface.textPrimary}
            theme={theme}
            className="shrink-0 text-right"
            labelClassName={theme === 'light' ? 'text-emerald-600' : 'text-emerald-400'}
            valueStyle={{
              fontSize: isSmall ? '1.25rem' : isMedium ? '1.45rem' : '1.7rem',
              lineHeight: 1,
              letterSpacing: '-0.03em',
            }}
          />
        </div>

        {hasSparklineData ? (
          <div className="mt-auto">
            <div
              className={`mt-3 flex items-center justify-between gap-2 text-xs ${surface.textMuted}`}
            >
              {trendTicks.map((point, index) => (
                <div
                  key={`${point.label || 'tick'}-${index}`}
                  className="min-w-0 flex-1 truncate whitespace-nowrap text-center first:text-left last:text-right"
                >
                  {point.label}
                </div>
              ))}
            </div>
          </div>
        ) : null}
      </div>
    </BaseCard>
  );
});
