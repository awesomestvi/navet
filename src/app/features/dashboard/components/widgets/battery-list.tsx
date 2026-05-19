import { useId } from 'react';
import { OverlayScrollArea } from '@/app/components/primitives';
import { BATTERY_LEVEL_COLORS, BATTERY_LEVEL_THRESHOLDS } from './battery-constants';

interface BatteryLevelIconProps {
  level: number;
  color: string;
  className?: string;
}

export function BatteryLevelIcon({ level, color, className }: BatteryLevelIconProps) {
  const clampedLevel = Math.max(0, Math.min(100, level));
  const fillWidth = (clampedLevel / 100) * 11;
  const maskId = useId();

  return (
    <svg
      viewBox="0 0 20 20"
      aria-hidden="true"
      className={className}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <rect x="2.25" y="5" width="14.5" height="10" rx="2.25" stroke={color} strokeWidth="1.5" />
      <rect x="17.25" y="8" width="1.75" height="4" rx="0.75" fill={color} />
      <defs>
        <clipPath id={maskId}>
          <rect x="4" y="6.75" width={fillWidth} height="6.5" rx="1.1" />
        </clipPath>
      </defs>
      <rect
        x="4"
        y="6.75"
        width="11"
        height="6.5"
        rx="1.1"
        fill={color}
        opacity={clampedLevel <= 20 ? 0.28 : 0.18}
      />
      <rect
        x="4"
        y="6.75"
        width="11"
        height="6.5"
        rx="1.1"
        fill={color}
        clipPath={`url(#${maskId})`}
      />
    </svg>
  );
}

interface BatteryListItemProps {
  device: {
    id: string;
    name: string;
    level: number;
  };
  isCompact: boolean;
  subtleFill: string;
  textSecondary: string;
  getLevelColor: (level: number) => string;
}

export function BatteryListItem({
  device,
  isCompact,
  subtleFill,
  textSecondary,
  getLevelColor,
}: BatteryListItemProps) {
  return (
    <li className="flex min-w-0 items-center gap-2">
      <BatteryLevelIcon
        level={device.level}
        color={getLevelColor(device.level)}
        className="h-3.5 w-3.5 shrink-0"
      />
      <span className={`min-w-0 flex-1 truncate text-xs ${textSecondary}`}>{device.name}</span>
      {!isCompact && (
        <div
          className="h-1.5 w-16 shrink-0 overflow-hidden rounded-full"
          style={{ background: subtleFill }}
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
        className="w-10 shrink-0 text-right text-xs font-medium tabular-nums"
        style={{ color: getLevelColor(device.level) }}
      >
        {device.level}%
      </span>
    </li>
  );
}

interface BatteryListProps {
  devices: Array<{
    id: string;
    name: string;
    level: number;
  }>;
  isCompact: boolean;
  subtleFill: string;
  textSecondary: string;
  emptyStateLabel: string;
  getLevelColor: (level: number) => string;
}

export function BatteryList({
  devices,
  isCompact,
  subtleFill,
  textSecondary,
  emptyStateLabel,
  getLevelColor,
}: BatteryListProps) {
  if (devices.length === 0) {
    return (
      <div className={`flex flex-1 items-center justify-center text-sm ${textSecondary}`}>
        {emptyStateLabel}
      </div>
    );
  }

  return (
    <OverlayScrollArea
      className="flex flex-1 flex-col"
      contentClassName="flex min-h-full flex-col pr-3"
    >
      <ul className="mt-auto min-w-0 space-y-1.5">
        {devices.map((device) => (
          <BatteryListItem
            key={device.id}
            device={device}
            isCompact={isCompact}
            subtleFill={subtleFill}
            textSecondary={textSecondary}
            getLevelColor={getLevelColor}
          />
        ))}
      </ul>
    </OverlayScrollArea>
  );
}

export function getLevelColor(level: number, accentHex: string) {
  if (level <= BATTERY_LEVEL_THRESHOLDS.CRITICAL) return BATTERY_LEVEL_COLORS.critical;
  if (level <= BATTERY_LEVEL_THRESHOLDS.LOW) return BATTERY_LEVEL_COLORS.low;
  return accentHex;
}
