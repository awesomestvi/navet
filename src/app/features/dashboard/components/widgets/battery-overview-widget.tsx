import { Battery, BatteryLow } from 'lucide-react';
import { memo } from 'react';
import { EntityCardHeader } from '@/app/components/primitives/entity-card-header';
import { EntityCardHeaderIcon } from '@/app/components/primitives/entity-card-header-icon';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import {
  haBatterySensorRowsEqual,
  selectBatterySensorRowsFromHa,
} from '@/app/hooks/ha-battery-sensor-rows';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface BatteryOverviewWidgetProps {
  size?: CardSize;
}

export const BatteryOverviewWidget = memo(function BatteryOverviewWidget({
  size = 'large',
}: BatteryOverviewWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme);
  const batteries = useHomeAssistant(selectBatterySensorRowsFromHa, haBatterySensorRowsEqual);

  const isCompact = isCompactCardSize(size);
  const accentHex = getThemeColorValue(primaryColor);

  const getLevelColor = (level: number) => {
    if (level <= 20) return '#ef4444';
    if (level <= 40) return '#f97316';
    return accentHex;
  };

  return (
    <div className={`${surface.panelClassName} flex h-full flex-col`}>
      <EntityCardHeader
        title={t('widgets.battery.title')}
        subtitle="Custom"
        layout="eyebrow-first"
        size={size}
        leading={<EntityCardHeaderIcon IconComponent={Battery} isActive size={size} />}
      />
      {batteries.length === 0 ? (
        <div className={`flex flex-1 items-center justify-center text-sm ${surface.textMuted}`}>
          {t('widgets.battery.noBatteries')}
        </div>
      ) : (
        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto">
          <ul className="mt-auto space-y-1.5">
            {batteries.map((device) => (
              <li key={device.id} className="flex items-center gap-2">
                {device.level <= 20 ? (
                  <BatteryLow className="h-3.5 w-3.5 shrink-0 text-red-400" />
                ) : (
                  <Battery
                    className="h-3.5 w-3.5 shrink-0"
                    style={{ color: getLevelColor(device.level) }}
                  />
                )}
                <span className={`flex-1 truncate text-xs ${surface.textSecondary}`}>
                  {device.name}
                </span>
                {!isCompact && (
                  <div
                    className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
                    style={{ background: surface.subtleFill }}
                  >
                    <div
                      className="h-full rounded-full transition-all"
                      style={{
                        width: `${device.level}%`,
                        backgroundColor: getLevelColor(device.level),
                      }}
                    />
                  </div>
                )}
                <span
                  className="w-8 shrink-0 text-right text-xs font-medium tabular-nums"
                  style={{ color: getLevelColor(device.level) }}
                >
                  {device.level}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
});
