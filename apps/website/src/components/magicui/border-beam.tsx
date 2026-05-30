import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '@/app/components/ui/utils';

export interface BorderBeamProps extends HTMLAttributes<HTMLSpanElement> {
  colorFrom?: string;
  colorTo?: string;
  duration?: number;
  size?: number;
  reverse?: boolean;
  delay?: number;
  borderWidth?: number;
  initialOffset?: number;
}

export function BorderBeam({
  className,
  style,
  colorFrom = '#ffaa40',
  colorTo = '#9c40ff',
  duration = 6,
  size = 50,
  reverse = false,
  delay = 0,
  borderWidth = 1,
  initialOffset = 0,
  ...props
}: BorderBeamProps) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        'magicui-border-beam pointer-events-none absolute inset-0 overflow-hidden rounded-[inherit]',
        reverse ? 'magicui-border-beam--reverse' : null,
        className
      )}
      style={
        {
          '--magic-beam-from': colorFrom,
          '--magic-beam-to': colorTo,
          '--magic-beam-duration': `${duration}s`,
          '--magic-beam-delay': `${delay}s`,
          '--magic-beam-size': `${size}%`,
          '--magic-beam-border-width': `${borderWidth}px`,
          '--magic-beam-offset': `${initialOffset}%`,
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}
