import type { LucideIcon } from 'lucide-react';

interface TinyCardWatermarkProps {
  IconComponent: LucideIcon;
  color: string;
  className?: string;
  spin?: boolean;
}

export function TinyCardWatermark({
  IconComponent,
  color,
  className = '',
  spin = false,
}: TinyCardWatermarkProps) {
  return (
    <IconComponent
      className={`pointer-events-none absolute bottom-3 right-3.5 h-7 w-7 ${spin ? 'animate-spin ' : ''}${className}`}
      style={{ color }}
    />
  );
}
