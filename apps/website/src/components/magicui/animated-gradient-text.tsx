import type { CSSProperties, HTMLAttributes } from 'react';
import { cn } from '@navet/app/components/ui/utils';

export interface AnimatedGradientTextProps extends HTMLAttributes<HTMLSpanElement> {
  colorFrom?: string;
  colorTo?: string;
  speed?: number;
}

export function AnimatedGradientText({
  className,
  style,
  colorFrom = '#ffaa40',
  colorTo = '#9c40ff',
  speed = 1,
  ...props
}: AnimatedGradientTextProps) {
  return (
    <span
      className={cn('magicui-animated-gradient-text', className)}
      style={
        {
          '--magic-gradient-from': colorFrom,
          '--magic-gradient-to': colorTo,
          '--magic-gradient-duration': `${Math.max(speed, 0.2) * 2.8}s`,
          ...style,
        } as CSSProperties
      }
      {...props}
    />
  );
}
