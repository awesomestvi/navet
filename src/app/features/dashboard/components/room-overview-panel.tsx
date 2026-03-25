import { Droplets, Thermometer } from 'lucide-react';
import { memo, useMemo } from 'react';
import { getThemeSurfaceTokens } from '@/app/components/shared/theme/theme-surface-tokens';
import { useTheme } from '@/app/hooks';
import type { DeviceWithType } from '@/app/types/device.types';

interface RoomOverviewPanelProps {
  room: string;
  orderedCardIds: string[];
  deviceMap: Map<string, DeviceWithType>;
}

function getNumericValue(value: unknown) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
}

function getRoomAmbientMetrics(orderedCardIds: string[], deviceMap: Map<string, DeviceWithType>) {
  let temperature: number | null = null;
  let humidity: number | null = null;

  for (const id of orderedCardIds) {
    const device = deviceMap.get(id);
    if (!device) {
      continue;
    }

    if (temperature === null) {
      if (device.type === 'climate') {
        temperature =
          getNumericValue(device.currentTemperature) ?? getNumericValue(device.temperature);
      } else if (device.type === 'weather') {
        temperature = getNumericValue(device.temperature);
      } else if (
        device.type === 'sensors' &&
        typeof device.unit === 'string' &&
        /°|c\b/i.test(device.unit) &&
        /temp/i.test(String(device.name))
      ) {
        temperature = getNumericValue(device.value);
      }
    }

    if (humidity === null) {
      if (device.type === 'weather') {
        humidity = getNumericValue(device.humidity);
      } else if (
        device.type === 'sensors' &&
        device.unit === '%' &&
        /humid/i.test(String(device.name))
      ) {
        humidity = getNumericValue(device.value);
      }
    }

    if (temperature !== null && humidity !== null) {
      break;
    }
  }

  return { temperature, humidity };
}

export const RoomOverviewPanel = memo(function RoomOverviewPanel({
  orderedCardIds,
  deviceMap,
}: RoomOverviewPanelProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const { temperature, humidity } = useMemo(
    () => getRoomAmbientMetrics(orderedCardIds, deviceMap),
    [deviceMap, orderedCardIds]
  );

  const metrics = [
    {
      id: 'temperature',
      label: 'Temperature',
      value: temperature !== null ? `${Math.round(temperature)}°C` : null,
      icon: Thermometer,
    },
    {
      id: 'humidity',
      label: 'Humidity',
      value: humidity !== null ? `${Math.round(humidity)}%` : null,
      icon: Droplets,
    },
  ].filter((metric) => metric.value !== null);

  if (metrics.length === 0) {
    return null;
  }

  return (
    <section className="flex flex-wrap gap-9">
      {metrics.map(({ id, label, value, icon: Icon }) => (
        <div key={id} className="inline-flex items-center gap-2.5">
          <div
            className={`flex h-8 w-8 items-center justify-center rounded-full border ${surface.borderStrong} bg-white/6`}
          >
            <Icon className={`h-4 w-4 ${surface.textPrimary}`} />
          </div>
          <div className="leading-none">
            <div className={`text-xs font-semibold tracking-tight ${surface.textPrimary}`}>
              {label}
            </div>
            <div className={`mt-px text-xs ${surface.textSecondary}`}>{value}</div>
          </div>
        </div>
      ))}
    </section>
  );
});
