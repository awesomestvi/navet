import { type MutableRefObject, useEffect, useMemo, useRef, useState } from 'react';

interface AutoScaledGridMeasurements {
  contentHeight: number;
  innerRef: MutableRefObject<HTMLDivElement | null>;
  outerRef: MutableRefObject<HTMLDivElement | null>;
  outerWidth: number;
}

export function useAutoScaledGridMeasurements(targetGridWidth: number): AutoScaledGridMeasurements {
  const outerRef = useRef<HTMLDivElement | null>(null);
  const innerRef = useRef<HTMLDivElement | null>(null);
  const [outerWidth, setOuterWidth] = useState(0);
  const [contentHeight, setContentHeight] = useState(0);
  const shouldTrackHeight = useMemo(
    () => outerWidth > 0 && outerWidth < targetGridWidth - 1,
    [outerWidth, targetGridWidth]
  );

  useEffect(() => {
    const outer = outerRef.current;
    const inner = innerRef.current;
    if (
      !outer ||
      !inner ||
      typeof ResizeObserver === 'undefined' ||
      typeof window === 'undefined'
    ) {
      return;
    }

    let pendingWidth = outer.clientWidth;
    let pendingHeight = inner.offsetHeight;
    let frameId: number | null = null;

    const flush = () => {
      frameId = null;
      setOuterWidth((previous) => (previous === pendingWidth ? previous : pendingWidth));
      if (shouldTrackHeight) {
        setContentHeight((previous) => (previous === pendingHeight ? previous : pendingHeight));
      } else {
        setContentHeight((previous) => (previous === 0 ? previous : 0));
      }
    };

    const scheduleFlush = () => {
      if (frameId !== null) {
        return;
      }

      frameId = window.requestAnimationFrame(flush);
    };

    const outerObserver = new ResizeObserver((entries) => {
      pendingWidth = entries[0]?.contentRect.width ?? outer.clientWidth;
      if (!shouldTrackHeight) {
        pendingHeight = 0;
      }
      scheduleFlush();
    });

    let innerObserver: ResizeObserver | null = null;
    if (shouldTrackHeight) {
      innerObserver = new ResizeObserver((entries) => {
        pendingHeight = entries[0]?.contentRect.height ?? inner.offsetHeight;
        scheduleFlush();
      });
      innerObserver.observe(inner);
    }

    outerObserver.observe(outer);
    scheduleFlush();

    return () => {
      outerObserver.disconnect();
      innerObserver?.disconnect();

      if (frameId !== null) {
        window.cancelAnimationFrame(frameId);
      }
    };
  }, [shouldTrackHeight]);

  return {
    contentHeight,
    innerRef,
    outerRef,
    outerWidth,
  };
}
