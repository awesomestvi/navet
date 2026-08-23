import type { CSSProperties, ReactNode } from 'react';

export interface CompactMeterListItemProps {
  label: string;
  value: string;
  level: number;
  color: string;
  subtleFill: string;
  textSecondary: string;
  leading?: ReactNode;
  isCompact?: boolean;
  layout?: 'compact' | 'fluid';
  textSecondaryStyle?: CSSProperties;
}

export function CompactMeterListItem({
  label,
  value,
  level,
  color,
  subtleFill,
  textSecondary,
  leading,
  isCompact = false,
  layout = 'compact',
  textSecondaryStyle,
}: CompactMeterListItemProps) {
  const clampedLevel = Math.max(0, Math.min(100, level));
  const isFluid = layout === 'fluid';

  return (
    <div
      className={
        isFluid
          ? 'flex min-w-0 items-center gap-2 sm:grid sm:grid-cols-[minmax(7rem,0.8fr)_minmax(5rem,1.2fr)_6rem] sm:gap-4'
          : 'flex min-w-0 items-center gap-2'
      }
    >
      <div className="flex min-w-0 flex-1 items-center gap-2">
        {leading}
        <span
          className={`min-w-0 flex-1 truncate text-xs ${isFluid ? 'sm:text-sm sm:font-medium' : ''} ${textSecondary}`}
          style={textSecondaryStyle}
        >
          {label}
        </span>
      </div>
      {!isCompact ? (
        <div
          className={
            isFluid
              ? 'h-1.5 w-16 shrink-0 overflow-hidden rounded-full sm:w-full sm:min-w-0'
              : 'h-1.5 w-16 shrink-0 overflow-hidden rounded-full'
          }
          style={{ background: subtleFill }}
          aria-hidden="true"
        >
          <div
            className="h-full rounded-full transition-[width,background-color]"
            style={{ width: `${clampedLevel}%`, backgroundColor: color }}
          />
        </div>
      ) : null}
      <span
        className={`min-w-10 shrink-0 text-right text-xs font-medium tabular-nums ${isFluid ? 'sm:text-sm sm:font-semibold' : ''}`}
        style={{ color }}
      >
        {value}
      </span>
    </div>
  );
}
