import { Gauge } from 'lucide-react';
import type { SensorReading } from './sensor-types';
import { iconMap } from './sensor-types';

interface SmallSensorDisplayProps {
  sensors: SensorReading[];
  textPrimaryColor: string;
  textSecondaryColor: string;
  size?: 'small' | 'medium';
}

export function SmallSensorDisplay({
  sensors,
  textPrimaryColor,
  textSecondaryColor,
  size = 'small',
}: SmallSensorDisplayProps) {
  const isMedium = size === 'medium';

  return (
    <div className={`w-full min-w-0 ${isMedium ? 'space-y-1.5' : 'space-y-0.5'}`}>
      {sensors.map((sensor) => {
        const SensorIcon = sensor.icon ? iconMap[sensor.icon] : Gauge;
        return (
          <div
            key={sensor.id}
            className="grid min-w-0 grid-cols-[minmax(0,1fr)_auto] items-center gap-2 text-xs"
          >
            <span
              className="flex min-w-0 items-center gap-1 overflow-hidden"
              style={{ color: textSecondaryColor }}
            >
              <SensorIcon className={`${isMedium ? 'h-3.5 w-3.5' : 'h-3 w-3'} shrink-0`} />
              <span className="min-w-0 truncate">{sensor.label}</span>
            </span>
            <span
              className="shrink-0 whitespace-nowrap text-right font-medium tabular-nums"
              style={{ color: textPrimaryColor }}
            >
              <span>{sensor.value}</span>
              {sensor.unit ? <span> {sensor.unit}</span> : null}
            </span>
          </div>
        );
      })}
    </div>
  );
}
