import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '@navet/ui/utils';

export interface ShineBorderProps extends Omit<HTMLAttributes<HTMLSpanElement>, 'color'> {
  color?: string | string[];
  duration?: number;
  borderWidth?: number;
}

export function ShineBorder({
  className,
  style,
  color = ['#ffaa40', '#9c40ff', '#4aa8ff'],
  duration = 12,
  borderWidth = 1,
  ...props
}: ShineBorderProps) {
  const colors = Array.isArray(color) ? color : [color];
  const gradientStops = colors.join(', ');

  return (
    <span
      aria-hidden="true"
      className={cn('sitefx-shine-border pointer-events-none absolute inset-0 rounded-[inherit]', className)}
      style={
        {
          '--magic-shine-colors': gradientStops,
          '--magic-shine-duration': `${duration}s`,
          '--magic-shine-border-width': `${borderWidth}px`,
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}
