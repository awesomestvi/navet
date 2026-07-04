import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '@navet/ui/utils';

export interface AnimatedGridPatternProps extends HTMLAttributes<HTMLDivElement> {
  width?: number;
  height?: number;
  duration?: number;
}

export function AnimatedGridPattern({
  className,
  style,
  width = 60,
  height = 60,
  duration = 20,
  ...props
}: AnimatedGridPatternProps) {
  return (
    <div
      className={cn('sitefx-animated-grid-pattern', className)}
      style={
        {
          '--magic-grid-width': `${width}px`,
          '--magic-grid-height': `${height}px`,
          '--magic-grid-duration': `${duration}s`,
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}
