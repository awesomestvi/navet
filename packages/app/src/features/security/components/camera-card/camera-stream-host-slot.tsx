import { cn } from '@navet/app/components/ui/utils';
import { useLayoutEffect, useRef } from 'react';

interface CameraStreamHostSlotProps {
  host: HTMLDivElement;
  className?: string;
  transparentMediaSurface?: boolean;
}

export function CameraStreamHostSlot({
  host,
  className,
  transparentMediaSurface = false,
}: CameraStreamHostSlotProps) {
  const slotRef = useRef<HTMLDivElement>(null);

  useLayoutEffect(() => {
    const slot = slotRef.current;
    if (!slot) return;

    slot.appendChild(host);
    return () => {
      if (host.parentElement === slot) {
        host.remove();
      }
    };
  }, [host]);

  return (
    <div
      ref={slotRef}
      className={cn(
        'absolute inset-0 h-full w-full',
        transparentMediaSurface && '[&_[data-camera-media-surface]]:bg-transparent',
        className
      )}
    />
  );
}
