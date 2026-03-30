import { useMemo } from 'react';
import type { CardSize } from '@/app/components/shared/card-size-selector';
import { getDashboardWidgetSurfaceTokens } from '@/app/components/shared/theme/dashboard-widget-surface-tokens';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { useEnergyHaData } from '../hooks/use-energy-ha-data';
import { useEnergyLoadHistory } from '../hooks/use-energy-load-history';
import { EnergySparkline } from './charts/energy-sparkline';

interface EnergySparklineCardWidgetProps {
  size?: CardSize;
}

export function EnergySparklineCardWidget({ size = 'medium' }: EnergySparklineCardWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme);
  const connected = useHomeAssistant(homeAssistantSelectors.connected);
  const { overview, currentLoadStatisticId, isConfigured } = useEnergyHaData('live');
  const trend = useEnergyLoadHistory(currentLoadStatisticId, overview.totals.currentLoadW);
  const isMedium = size === 'medium';
  const accentColor = getThemeColorValue(primaryColor);
  const chartData = useMemo(
    () =>
      trend.map((point) => ({
        value: point.value,
        timestampMs: point.timestampMs,
        endTimestampMs: point.endTimestampMs,
        minValue: point.minValue,
        maxValue: point.maxValue,
      })),
    [trend]
  );
  const hasTrend = chartData.length >= 2;

  const panelClassName = `${surface.panelClassName} relative flex h-full flex-col`;

  if (!connected) {
    return (
      <div className={panelClassName} style={surface.panelStyle}>
        <div className="flex h-full flex-1 items-center justify-center text-center">
          <p className={`max-w-52 text-sm ${surface.textMuted}`}>
            {t('network.disconnectedTitle')}
          </p>
        </div>
      </div>
    );
  }

  if (!isConfigured) {
    return (
      <div className={panelClassName} style={surface.panelStyle}>
        <div className="flex h-full flex-1 items-center justify-center text-center">
          <p className={`max-w-56 text-sm ${surface.textMuted}`}>
            {t('widgets.energySparkline.needsSetup')}
          </p>
        </div>
      </div>
    );
  }

  const valueClassName = isMedium ? 'text-xl' : 'text-2xl';

  return (
    <div className={panelClassName} style={surface.panelStyle}>
      {surface.glowStyle ? <div className="absolute inset-0" style={surface.glowStyle} /> : null}
      {surface.overlayClassName ? (
        <div className={`pointer-events-none absolute inset-0 ${surface.overlayClassName}`} />
      ) : null}

      <div className={`relative z-2 flex h-full min-h-0 flex-col ${isMedium ? 'gap-1' : ''}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div
              className={`${valueClassName} font-semibold tracking-tight ${surface.textPrimary}`}
            >
              {Math.round(overview.totals.currentLoadW)} W
            </div>
            <div className={`${isMedium ? 'mt-0.5' : 'mt-1'} text-xs ${surface.textSecondary}`}>
              {t('energy.widgets.now.currentPower')}
            </div>
          </div>
        </div>

        <div
          className={
            isMedium ? 'mt-1 -mx-4 -mb-4 min-h-0 flex-1' : 'mt-4 -mx-4 -mb-4 min-h-0 flex-1'
          }
        >
          {hasTrend ? (
            <div className="h-full min-h-0 overflow-visible">
              <EnergySparkline
                data={chartData}
                accentColor={accentColor}
                height={64}
                className="h-full w-full"
                showYAxisMarks
              />
            </div>
          ) : (
            <div
              className={`flex min-h-24 items-center justify-center rounded-2xl border border-dashed ${surface.borderClassName} text-sm ${surface.textMuted}`}
            >
              {t('widgets.energySparkline.noHistory')}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
