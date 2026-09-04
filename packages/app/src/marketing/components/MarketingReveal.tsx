import { cn } from '@navet/app/components/ui/utils';
import { type ReactNode, useEffect, useRef } from 'react';

/** Reveal once, then release the observer. Content stays visible without motion support. */
export function MarketingReveal({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const element = ref.current;
    if (
      !element ||
      typeof window.IntersectionObserver !== 'function' ||
      typeof window.matchMedia !== 'function' ||
      window.matchMedia('(prefers-reduced-motion: reduce)').matches
    ) {
      return;
    }

    element.dataset.reveal = 'pending';
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          element.dataset.reveal = 'visible';
          observer.disconnect();
        }
      },
      { threshold: 0.08 }
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  return (
    <div ref={ref} className={cn('marketing-reveal', className)}>
      {children}
    </div>
  );
}
