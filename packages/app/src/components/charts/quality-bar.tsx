import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { memo } from 'react';

interface QualityBarProps {
  value: number;
  accentColor: string;
  ariaLabel: string;
  labels: readonly [string, string, string];
  className?: string;
}

export const QualityBar = memo(function QualityBar({
  value,
  accentColor,
  ariaLabel,
  labels,
  className,
}: QualityBarProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const percentage = Math.min(100, Math.max(0, value));

  return (
    <div className={cn('min-w-0', className)}>
      <meter
        className="sr-only"
        min={0}
        max={100}
        value={Math.round(percentage)}
        aria-label={ariaLabel}
      />
      <div
        className={cn('h-1.5 overflow-hidden rounded-full', surface.subtleBg)}
        data-quality-bar-track
      >
        <div
          className="h-full rounded-full transition-[width] duration-300 motion-reduce:transition-none"
          style={{ width: `${percentage}%`, backgroundColor: accentColor }}
          data-quality-bar-fill
        />
      </div>
      <div
        className={cn(
          'mt-2 grid grid-cols-3 gap-1 text-[10px] leading-none',
          surface.textSecondary
        )}
        aria-hidden="true"
      >
        <span className="truncate text-left">{labels[0]}</span>
        <span className="truncate text-center">{labels[1]}</span>
        <span className="truncate text-right">{labels[2]}</span>
      </div>
    </div>
  );
});
