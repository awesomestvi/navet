import {
  cloneElement,
  isValidElement,
  type ReactElement,
  type ReactNode,
  useId,
  useState,
} from 'react';
import { cn } from '@/app/components/ui/utils';

export interface TooltipProps {
  content: ReactNode;
  side?: 'top' | 'bottom';
  className?: string;
  children: ReactNode;
}

// Status: proposed. Lightweight local tooltip wrapper until the app proves a richer shared tooltip system.
// TODO: Revisit this if we need portalling, collision handling, or delayed-open behavior across multiple features.
export function Tooltip({ content, side = 'top', className, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  const triggerProps = {
    onMouseEnter: () => setOpen(true),
    onMouseLeave: () => setOpen(false),
    onFocus: () => setOpen(true),
    onBlur: () => setOpen(false),
    'aria-describedby': open ? id : undefined,
  };

  const trigger = isValidElement(children) ? (
    cloneElement(children as ReactElement, triggerProps)
  ) : (
    <button type="button" className="inline-flex" {...triggerProps}>
      {children}
    </button>
  );

  return (
    <span className={cn('relative inline-flex', className)}>
      {trigger}
      {open ? (
        <span
          id={id}
          role="tooltip"
          className={cn(
            'pointer-events-none absolute z-30 max-w-52 rounded-2xl border border-white/12 bg-zinc-950/95 px-3 py-2 text-xs text-white shadow-xl backdrop-blur-xl',
            side === 'top'
              ? 'bottom-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2'
              : 'top-[calc(100%+0.5rem)] left-1/2 -translate-x-1/2'
          )}
        >
          {content}
        </span>
      ) : null}
    </span>
  );
}
