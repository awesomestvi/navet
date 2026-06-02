import { type ReactNode, Suspense, useEffect, useRef, useState } from 'react';

function scheduleDeferredLoad(callback: () => void) {
  const deferredWindow = window as Window & {
    requestIdleCallback?: (cb: () => void, options?: { timeout: number }) => number;
    cancelIdleCallback?: (id: number) => void;
  };

  if (typeof deferredWindow.requestIdleCallback === 'function') {
    const idleId = deferredWindow.requestIdleCallback(callback, { timeout: 1200 });
    return () => deferredWindow.cancelIdleCallback?.(idleId);
  }

  const timeoutId = window.setTimeout(callback, 250);
  return () => window.clearTimeout(timeoutId);
}

export function MarketingDeferredSection({
  children,
  fallback,
}: {
  children: ReactNode;
  fallback: ReactNode;
}) {
  const [isReady, setIsReady] = useState(false);
  const placeholderRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    if (isReady) {
      return;
    }

    let cleanupDeferredLoad: () => void = () => undefined;
    let observer: IntersectionObserver | null = null;

    const reveal = () => {
      setIsReady(true);
      cleanupDeferredLoad();
      observer?.disconnect();
    };

    cleanupDeferredLoad = scheduleDeferredLoad(reveal);

    if (typeof window.IntersectionObserver === 'function' && placeholderRef.current) {
      observer = new window.IntersectionObserver(
        (entries) => {
          if (entries.some((entry) => entry.isIntersecting)) {
            reveal();
          }
        },
        { rootMargin: '320px 0px' }
      );
      observer.observe(placeholderRef.current);
    }

    return () => {
      cleanupDeferredLoad();
      observer?.disconnect();
    };
  }, [isReady]);

  if (!isReady) {
    return <div ref={placeholderRef}>{fallback}</div>;
  }

  return <Suspense fallback={fallback}>{children}</Suspense>;
}
