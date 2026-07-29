import { startTransition, useEffect, useRef, useState } from 'react';

interface UseDeferredVisibilityOptions {
  disabled?: boolean;
  freezeOnceVisible?: boolean;
  initiallyVisible?: boolean;
  rootMargin?: string;
  threshold?: number;
}

export function useDeferredVisibility<T extends HTMLElement>({
  disabled = false,
  freezeOnceVisible = true,
  initiallyVisible = false,
  rootMargin = '150px 0px',
  threshold = 0,
}: UseDeferredVisibilityOptions = {}) {
  const ref = useRef<T | null>(null);
  const [isVisible, setIsVisible] = useState(disabled || initiallyVisible);

  useEffect(() => {
    if (disabled || initiallyVisible) {
      setIsVisible(true);
      return;
    }

    const node = ref.current;
    if (!node) {
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        const nextIsVisible = entry?.isIntersecting ?? false;
        startTransition(() => {
          setIsVisible(nextIsVisible);
        });
        if (nextIsVisible && freezeOnceVisible) {
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [disabled, freezeOnceVisible, initiallyVisible, rootMargin, threshold]);

  return { ref, isVisible };
}
