import { Battery, BatteryLow } from 'lucide-react';
import { memo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useI18n, useTheme } from '@/app/hooks';
import { EnergyWidgetShell } from '../energy-widget-shell';

interface BatteryDevice {
  id: string;
  name: string;
  level: number;
}

interface EnergyBatteryDevicesWidgetProps {
  devices: BatteryDevice[];
}

export const EnergyBatteryDevicesWidget = memo(function EnergyBatteryDevicesWidget({
  devices,
}: EnergyBatteryDevicesWidgetProps) {
  const { t } = useI18n();
  const { theme, accentColor } = useTheme();
  const surface = getThemeSurfaceTokens(theme);

  const getLevelColor = (level: number) => {
    if (level <= 20) return '#ef4444';
    if (level <= 40) return '#f97316';
    return accentColor;
  };

  return (
    <EnergyWidgetShell
      title={t('energy.widgets.batteryDevices.title')}
      eyebrow={t('energy.widgets.batteryDevices.eyebrow')}
      action={<Battery className={`h-4 w-4 ${surface.textMuted}`} />}
    >
      <div className="space-y-3">
        {devices.length === 0 ? (
          <div className={`rounded-3xl border p-4 text-sm ${surface.border} ${surface.textMuted}`}>
            {t('energy.widgets.batteryDevices.empty')}
          </div>
        ) : (
          devices.map((device) => (
            <div
              key={device.id}
              className={`rounded-3xl border p-4 ${surface.border} ${surface.panelMuted}`}
            >
              <div className="flex items-center gap-3">
                {device.level <= 20 ? (
                  <BatteryLow className="h-4 w-4 shrink-0 text-red-400" />
                ) : (
                  <Battery
                    className="h-4 w-4 shrink-0"
                    style={{ color: getLevelColor(device.level) }}
                  />
                )}
                <div className="min-w-0 flex-1">
                  <div className={`truncate text-sm font-semibold ${surface.textPrimary}`}>
                    {device.name}
                  </div>
                  <div className="mt-2 h-2 rounded-full bg-white/8">
                    <div
                      className="h-2 rounded-full"
                      style={{
                        width: `${device.level}%`,
                        backgroundColor: getLevelColor(device.level),
                      }}
                    />
                  </div>
                </div>
                <div
                  className="w-12 shrink-0 text-right text-sm font-semibold"
                  style={{ color: getLevelColor(device.level) }}
                >
                  {device.level}%
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </EnergyWidgetShell>
  );
});
