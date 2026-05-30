import type { CSSProperties, HTMLAttributes, ReactNode } from 'react';
import { useState } from 'react';
import { cn } from '@/app/components/ui/utils';

export interface MagicCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode;
  spotlightColor?: string;
  spotlightSize?: number;
  borderGlowColor?: string;
}

export function MagicCard({
  children,
  className,
  style,
  spotlightColor = 'rgba(255, 177, 79, 0.16)',
  spotlightSize = 280,
  borderGlowColor = 'rgba(255, 255, 255, 0.08)',
  onMouseMove,
  onMouseLeave,
  ...props
}: MagicCardProps) {
  const [pointer, setPointer] = useState({ x: '50%', y: '50%', active: false });

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-[28px] border',
        'before:pointer-events-none before:absolute before:inset-0 before:rounded-[inherit]',
        'before:bg-[radial-gradient(circle_at_var(--magic-card-x)_var(--magic-card-y),var(--magic-card-spotlight),transparent_48%)]',
        'before:opacity-[var(--magic-card-opacity)] before:transition-opacity before:duration-300',
        'after:pointer-events-none after:absolute after:inset-px after:rounded-[calc(1.75rem-1px)]',
        'after:border after:border-white/[0.03] after:[box-shadow:inset_0_1px_0_rgba(255,255,255,0.06)]',
        className
      )}
      style={
        {
          '--magic-card-x': pointer.x,
          '--magic-card-y': pointer.y,
          '--magic-card-opacity': pointer.active ? 1 : 0.55,
          '--magic-card-spotlight': spotlightColor,
          '--magic-card-glow': borderGlowColor,
          ...style,
        } as CSSProperties
      }
      onMouseMove={(event) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const x = `${event.clientX - rect.left}px`;
        const y = `${event.clientY - rect.top}px`;
        setPointer({ x, y, active: true });
        onMouseMove?.(event);
      }}
      onMouseLeave={(event) => {
        setPointer((current) => ({ ...current, active: false }));
        onMouseLeave?.(event);
      }}
      {...props}
    >
      <div
        className="pointer-events-none absolute inset-0 rounded-[inherit] opacity-90"
        style={{
          boxShadow: `inset 0 0 0 1px ${borderGlowColor}`,
        }}
      />
      {children}
    </div>
  );
}
