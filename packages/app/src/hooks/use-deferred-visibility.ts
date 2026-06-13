import { startTransition, useEffect, useRef, useState } from 'react';

interface UseDeferredVisibilityOptions {
  disabled?: boolean;
  initiallyVisible?: boolean;
  rootMargin?: string;
  threshold?: number;
}

export function useDeferredVisibility<T extends HTMLElement>({
  disabled = false,
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
        if (entry?.isIntersecting) {
          startTransition(() => {
            setIsVisible(true);
          });
          observer.disconnect();
        }
      },
      { rootMargin, threshold }
    );

    observer.observe(node);

    return () => {
      observer.disconnect();
    };
  }, [disabled, initiallyVisible, rootMargin, threshold]);

  return { ref, isVisible };
}
