import type { LucideIcon } from 'lucide-react';

interface TinyCardWatermarkProps {
  IconComponent?: LucideIcon | null;
  iconText?: string | null;
  color: string;
  className?: string;
  spin?: boolean;
}

export function TinyCardWatermark({
  IconComponent,
  iconText,
  color,
  className = '',
  spin = false,
}: TinyCardWatermarkProps) {
  if (IconComponent) {
    return (
      <IconComponent
        className={`pointer-events-none absolute bottom-3 right-3.5 h-7 w-7 ${spin ? 'animate-spin ' : ''}${className}`}
        style={{ color }}
      />
    );
  }

  if (iconText) {
    return (
      <span
        className={`pointer-events-none absolute bottom-3 right-3.5 max-w-8 overflow-hidden text-ellipsis whitespace-nowrap text-lg leading-none ${className}`}
        style={{ color }}
      >
        {iconText}
      </span>
    );
  }

  return null;
}
