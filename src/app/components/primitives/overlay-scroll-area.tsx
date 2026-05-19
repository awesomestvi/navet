import {
  type CSSProperties,
  type PointerEvent,
  type ReactNode,
  useCallback,
  useEffect,
  useRef,
  useState,
} from 'react';
import { cn } from '@/app/components/ui/utils';

interface OverlayScrollAreaStyle extends CSSProperties {
  '--overlay-scrollbar-size': string;
  '--overlay-scrollbar-start': string;
  '--overlay-scrollbar-track-end': string;
  '--overlay-scrollbar-track-start': string;
}

interface OverlayScrollAreaProps {
  children: ReactNode;
  className?: string;
  viewportClassName?: string;
  contentClassName?: string;
  scrollbarEndInset?: number;
  scrollbarStartInset?: number;
}

export function OverlayScrollArea({
  children,
  className,
  viewportClassName,
  contentClassName,
  scrollbarEndInset = 4,
  scrollbarStartInset = 4,
}: OverlayScrollAreaProps) {
  const [hasOverflow, setHasOverflow] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const [scrollbarStyle, setScrollbarStyle] = useState<OverlayScrollAreaStyle>({
    '--overlay-scrollbar-size': '0px',
    '--overlay-scrollbar-start': '0px',
    '--overlay-scrollbar-track-end': `${scrollbarEndInset}px`,
    '--overlay-scrollbar-track-start': `${scrollbarStartInset}px`,
  });
  const viewportRef = useRef<HTMLDivElement>(null);
  const dragStateRef = useRef<{
    maxScrollTop: number;
    maxThumbTop: number;
    startScrollTop: number;
    startY: number;
  } | null>(null);

  const updateScrollbarMetrics = useCallback(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    const { clientHeight, scrollHeight, scrollTop } = viewport;
    const maxScrollTop = scrollHeight - clientHeight;
    const trackHeight = Math.max(0, clientHeight - scrollbarStartInset - scrollbarEndInset);

    if (maxScrollTop <= 1 || trackHeight <= 0) {
      setHasOverflow(false);
      setScrollbarStyle({
        '--overlay-scrollbar-size': '0px',
        '--overlay-scrollbar-start': '0px',
        '--overlay-scrollbar-track-end': `${scrollbarEndInset}px`,
        '--overlay-scrollbar-track-start': `${scrollbarStartInset}px`,
      });
      return;
    }

    const thumbHeight = Math.max(28, (clientHeight / scrollHeight) * trackHeight);
    const maxThumbTop = trackHeight - thumbHeight;
    const thumbTop = (scrollTop / maxScrollTop) * maxThumbTop;

    setHasOverflow(true);
    setScrollbarStyle({
      '--overlay-scrollbar-size': `${thumbHeight}px`,
      '--overlay-scrollbar-start': `${thumbTop}px`,
      '--overlay-scrollbar-track-end': `${scrollbarEndInset}px`,
      '--overlay-scrollbar-track-start': `${scrollbarStartInset}px`,
    });
  }, [scrollbarEndInset, scrollbarStartInset]);

  const handleScroll = useCallback(() => {
    updateScrollbarMetrics();
  }, [updateScrollbarMetrics]);

  const handleThumbPointerDown = useCallback(
    (event: PointerEvent<HTMLDivElement>) => {
      const viewport = viewportRef.current;

      if (!viewport) {
        return;
      }

      const { clientHeight, scrollHeight, scrollTop } = viewport;
      const maxScrollTop = scrollHeight - clientHeight;
      const trackHeight = Math.max(0, clientHeight - scrollbarStartInset - scrollbarEndInset);

      if (maxScrollTop <= 1 || trackHeight <= 0) {
        return;
      }

      const thumbHeight = Math.max(28, (clientHeight / scrollHeight) * trackHeight);
      dragStateRef.current = {
        maxScrollTop,
        maxThumbTop: trackHeight - thumbHeight,
        startScrollTop: scrollTop,
        startY: event.clientY,
      };
      setIsDragging(true);
      event.currentTarget.setPointerCapture(event.pointerId);
      event.preventDefault();
    },
    [scrollbarEndInset, scrollbarStartInset]
  );

  const handleThumbPointerMove = useCallback((event: PointerEvent<HTMLDivElement>) => {
    const viewport = viewportRef.current;
    const dragState = dragStateRef.current;

    if (!viewport || !dragState) {
      return;
    }

    const scrollDelta =
      ((event.clientY - dragState.startY) / dragState.maxThumbTop) * dragState.maxScrollTop;
    viewport.scrollTop = dragState.startScrollTop + scrollDelta;
  }, []);

  const handleThumbPointerUp = useCallback((event: PointerEvent<HTMLDivElement>) => {
    dragStateRef.current = null;
    setIsDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }, []);

  useEffect(() => {
    const viewport = viewportRef.current;

    if (!viewport) {
      return;
    }

    updateScrollbarMetrics();

    if (typeof ResizeObserver === 'undefined') {
      window.addEventListener('resize', updateScrollbarMetrics);

      return () => {
        window.removeEventListener('resize', updateScrollbarMetrics);
      };
    }

    const resizeObserver = new ResizeObserver(updateScrollbarMetrics);
    resizeObserver.observe(viewport);

    if (viewport.firstElementChild) {
      resizeObserver.observe(viewport.firstElementChild);
    }

    return () => {
      resizeObserver.disconnect();
    };
  }, [updateScrollbarMetrics]);

  return (
    <div
      className={cn(
        'overlay-scroll-area relative min-h-0 min-w-0',
        isDragging && 'is-dragging',
        className
      )}
      style={scrollbarStyle}
    >
      <div
        ref={viewportRef}
        className={cn(
          'h-full min-h-0 overflow-y-auto overflow-x-hidden scrollbar-hide',
          viewportClassName
        )}
        onScroll={handleScroll}
      >
        <div className={contentClassName}>{children}</div>
      </div>
      {hasOverflow ? (
        <div
          aria-hidden="true"
          className="overlay-scrollbar-track absolute right-0 z-10 w-2 touch-none select-none rounded-full"
        >
          <div
            className="overlay-scrollbar-thumb absolute left-1/2 w-1.5 -translate-x-1/2 rounded-full"
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
            onPointerUp={handleThumbPointerUp}
            onPointerCancel={handleThumbPointerUp}
          />
        </div>
      ) : null}
    </div>
  );
}
