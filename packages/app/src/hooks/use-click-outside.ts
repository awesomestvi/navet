import { type RefObject, useEffect, useRef } from 'react';

/**
 * Custom hook for detecting clicks outside of an element
 *
 * @param callback - Function to call when click outside is detected
 * @returns Ref to attach to the element
 *
 * @example
 * const ref = useClickOutside(() => setIsOpen(false));
 * return <div ref={ref}>...</div>
 */
export function useClickOutside<T extends HTMLElement = HTMLElement>(
  callback: () => void,
  enabled = true,
  ignoredRefs: Array<RefObject<HTMLElement | null>> = []
): RefObject<T | null> {
  const ref = useRef<T>(null);

  useEffect(() => {
    if (!enabled) {
      return;
    }

    const handleClick = (event: PointerEvent) => {
      if (event.defaultPrevented) {
        return;
      }

      if (ignoredRefs.some((ignoredRef) => ignoredRef.current?.contains(event.target as Node))) {
        return;
      }

      if (ref.current && !ref.current.contains(event.target as Node)) {
        callback();
      }
    };

    document.addEventListener('pointerdown', handleClick);
    return () => {
      document.removeEventListener('pointerdown', handleClick);
    };
  }, [callback, enabled, ignoredRefs]);

  return ref;
}
