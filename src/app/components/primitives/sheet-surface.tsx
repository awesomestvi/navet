import * as Dialog from '@radix-ui/react-dialog';
import {
  type CSSProperties,
  type ReactNode,
  type PointerEvent as ReactPointerEvent,
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
} from 'react';
import { DialogShell } from '@/app/components/primitives/dialog-shell';
import {
  getUiKitGlassSheetGlowClassName,
  getUiKitSheetContentClassName,
  getUiKitSheetOverlayClassName,
} from '@/app/components/system/tokens/ui-kit-surfaces';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface SheetSurfaceProps {
  isOpen: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description: string;
  children: ReactNode;
  accentColor?: string;
  contentClassName?: string;
  overlayClassName?: string;
  bodyClassName?: string;
  contentStyle?: CSSProperties;
  contentGlowClassName?: string;
}

export function SheetSurface({
  isOpen,
  onOpenChange,
  title,
  description,
  children,
  accentColor,
  contentClassName,
  overlayClassName,
  bodyClassName,
  contentStyle,
  contentGlowClassName,
}: SheetSurfaceProps) {
  const { theme } = useTheme();
  const descriptionId = useId();
  const [dragOffset, setDragOffset] = useState(0);
  const [isDragging, setIsDragging] = useState(false);
  const dragStartYRef = useRef(0);
  const dragOffsetRef = useRef(0);
  const dragPointerIdRef = useRef<number | null>(null);
  const suppressHandleClickRef = useRef(false);

  const resetDragState = useCallback(() => {
    dragOffsetRef.current = 0;
    dragPointerIdRef.current = null;
    suppressHandleClickRef.current = false;
    setDragOffset(0);
    setIsDragging(false);
  }, []);

  useEffect(() => {
    if (!isOpen) {
      resetDragState();
    }
  }, [isOpen, resetDragState]);

  useEffect(() => {
    if (!isDragging) {
      return;
    }

    const dismissThresholdPx = 72;

    const handlePointerMove = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerIdRef.current) {
        return;
      }

      const deltaY = Math.max(0, event.clientY - dragStartYRef.current);
      if (deltaY > 6) {
        suppressHandleClickRef.current = true;
      }
      dragOffsetRef.current = deltaY;
      setDragOffset(deltaY);
    };

    const finishDrag = (event: PointerEvent) => {
      if (event.pointerId !== dragPointerIdRef.current) {
        return;
      }

      const shouldClose = dragOffsetRef.current >= dismissThresholdPx;
      setIsDragging(false);
      dragPointerIdRef.current = null;

      if (shouldClose) {
        onOpenChange(false);
        dragOffsetRef.current = 0;
        setDragOffset(0);
        return;
      }

      dragOffsetRef.current = 0;
      setDragOffset(0);
      window.setTimeout(() => {
        suppressHandleClickRef.current = false;
      }, 0);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', finishDrag);
    window.addEventListener('pointercancel', finishDrag);

    return () => {
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', finishDrag);
      window.removeEventListener('pointercancel', finishDrag);
    };
  }, [isDragging, onOpenChange]);

  const handlePointerDown = (event: ReactPointerEvent<HTMLButtonElement>) => {
    if (event.pointerType === 'mouse' && event.button !== 0) {
      return;
    }

    dragPointerIdRef.current = event.pointerId;
    dragStartYRef.current = event.clientY;
    dragOffsetRef.current = 0;
    suppressHandleClickRef.current = false;
    setIsDragging(true);
    setDragOffset(0);
  };

  const handleClick = () => {
    if (suppressHandleClickRef.current) {
      suppressHandleClickRef.current = false;
      return;
    }

    onOpenChange(false);
  };

  const resolvedContentStyle: CSSProperties = {
    ...(theme === 'glass' && accentColor
      ? {
          boxShadow: `0 -24px 64px -40px ${accentColor}66, 0 24px 48px -36px rgba(0,0,0,0.72)`,
        }
      : {}),
    ...contentStyle,
    transform: `translateY(${dragOffset}px)`,
    transition: isDragging ? 'none' : 'transform 180ms ease-out',
  };

  return (
    <DialogShell
      isOpen={isOpen}
      onOpenChange={onOpenChange}
      contentAriaDescribedBy={descriptionId}
      overlayClassName={overlayClassName ?? getUiKitSheetOverlayClassName(theme)}
      contentClassName={cn(getUiKitSheetContentClassName(theme), contentClassName)}
      contentGlowClassName={contentGlowClassName ?? getUiKitGlassSheetGlowClassName(theme)}
      contentStyle={resolvedContentStyle}
    >
      <Dialog.Title className="sr-only">{title}</Dialog.Title>
      <Dialog.Description id={descriptionId} className="sr-only">
        {description}
      </Dialog.Description>
      <div
        className={cn(
          'relative pb-[calc(env(safe-area-inset-bottom,0px)+0.9rem)] pt-3',
          bodyClassName
        )}
      >
        <button
          type="button"
          onPointerDown={handlePointerDown}
          onClick={handleClick}
          className="mx-auto mb-3 flex h-5 w-16 touch-none items-center justify-center"
          aria-label={`Close ${title}`}
        >
          <span className="h-1.5 w-12 rounded-full bg-white/20" aria-hidden="true" />
        </button>
        {children}
      </div>
    </DialogShell>
  );
}
