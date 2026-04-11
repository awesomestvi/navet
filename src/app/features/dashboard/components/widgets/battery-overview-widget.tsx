import { Battery, BatteryLow } from 'lucide-react';
import { memo, useDeferredValue, useMemo } from 'react';
import { type CardSize, isCompactCardSize } from '@/app/components/shared/card-size-selector';
import { getThemeColorValue } from '@/app/components/shared/theme/theme-colors';
import { useHomeAssistant, useI18n, useTheme } from '@/app/hooks';
import { homeAssistantSelectors } from '@/app/stores/selectors';
import { getDashboardWidgetSurfaceTokens } from './widget-surface-tokens';

interface BatteryDevice {
  id: string;
  name: string;
  level: number;
}

interface BatteryOverviewWidgetProps {
  size?: CardSize;
}

export const BatteryOverviewWidget = memo(function BatteryOverviewWidget({
  size = 'large',
}: BatteryOverviewWidgetProps) {
  const { theme, primaryColor } = useTheme();
  const { t } = useI18n();
  const surface = getDashboardWidgetSurfaceTokens(theme);
  const entities = useDeferredValue(useHomeAssistant(homeAssistantSelectors.entities));

  const batteries = useMemo<BatteryDevice[]>(() => {
    if (!entities) return [];
    return Object.entries(entities)
      .filter(
        ([, entity]) =>
          (entity.attributes as Record<string, unknown>).device_class === 'battery' &&
          !Number.isNaN(Number(entity.state))
      )
      .map(([id, entity]) => ({
        id,
        name:
          ((entity.attributes as Record<string, unknown>).friendly_name as string) ||
          id.replace('sensor.', '').replace(/_/g, ' '),
        level: Math.min(100, Math.max(0, Math.round(Number(entity.state)))),
      }))
      .sort((a, b) => a.level - b.level);
  }, [entities]);

  const isCompact = isCompactCardSize(size);
  const accentHex = getThemeColorValue(primaryColor);

  const getLevelColor = (level: number) => {
    if (level <= 20) return '#ef4444';
    if (level <= 40) return '#f97316';
    return accentHex;
  };

  return (
    <div className={`${surface.panelClassName} flex h-full flex-col`}>
      {batteries.length === 0 ? (
        <div className={`flex flex-1 items-center justify-center text-sm ${surface.textMuted}`}>
          {t('widgets.battery.noBatteries')}
        </div>
      ) : (
        <ul className="flex-1 space-y-1.5 overflow-y-auto">
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
      )}
    </div>
  );
});
