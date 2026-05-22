import { Gauge } from 'lucide-react';
import type { SensorReading } from './sensor-types';
import { iconMap } from './sensor-types';

interface GridSensorDisplayProps {
  sensors: SensorReading[];
  textPrimaryColor: string;
  textSecondaryColor: string;
  accentColor: string;
  colors: { accent: string };
  isMedium: boolean;
}

export function GridSensorDisplay({
  sensors,
  textPrimaryColor,
  textSecondaryColor,
  accentColor,
  colors,
  isMedium,
}: GridSensorDisplayProps) {
  return (
    <div className="w-full grid grid-cols-2 gap-x-4 gap-y-2">
      {sensors.map((sensor) => {
        const SensorIcon = sensor.icon ? iconMap[sensor.icon] : Gauge;
        return (
          <div key={sensor.id} className="flex flex-col">
            <span
              className="mb-1 flex items-center gap-1 truncate text-xs"
              style={{ color: textSecondaryColor }}
            >
              <SensorIcon className="w-3 h-3 flex-shrink-0" />
              {sensor.label}
            </span>
            <div>
              <span
                className={`${isMedium ? 'text-xl' : 'text-2xl'} font-bold leading-none`}
                style={{ color: textPrimaryColor }}
              >
                {sensor.value}
              </span>
              <span className={`ml-1 text-sm ${colors.accent}`} style={{ color: accentColor }}>
                {sensor.unit}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
