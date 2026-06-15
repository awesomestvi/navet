import { navetRadiusTokens } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import { Check } from 'lucide-react';
import { useMemo } from 'react';

export interface StepperItem {
  id: string;
  label: string;
  compactLabel?: string;
  optional?: boolean;
}

export interface StepperProps {
  items: StepperItem[];
  currentStep: number;
  className?: string;
  size?: 'default' | 'compact';
}

// Status: in-progress. Compact horizontal stepper for short multi-step flows.
export function Stepper({ items, currentStep, className, size = 'default' }: StepperProps) {
  const { theme, accentColor } = useTheme();
  const currentIndex = useMemo(
    () => Math.max(0, Math.min(items.length - 1, currentStep)),
    [currentStep, items.length]
  );
  const isCompact = size === 'compact';

  return (
    <ol
      className={cn(
        'flex items-center pb-1',
        isCompact ? 'w-full gap-1 overflow-hidden' : 'gap-2 overflow-x-auto',
        className
      )}
    >
      {items.map((item, index) => {
        const status =
          index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
        const resolvedLabel = isCompact ? (item.compactLabel ?? item.label) : item.label;
        const capsuleClassName =
          status === 'current'
            ? theme === 'light'
              ? 'border-transparent bg-white text-gray-900 shadow-[0_10px_30px_rgba(15,23,42,0.08)]'
              : theme === 'black'
                ? 'border-transparent bg-black text-white'
                : theme === 'glass'
                  ? 'border-white/18 bg-white/14 text-white'
                  : 'border-zinc-700 bg-zinc-900 text-white'
            : status === 'complete'
              ? theme === 'light'
                ? 'border-gray-200 bg-gray-100 text-gray-700'
                : theme === 'black'
                  ? 'border-white/16 bg-zinc-950 text-zinc-200'
                  : theme === 'glass'
                    ? 'border-white/12 bg-white/8 text-white/72'
                    : 'border-zinc-800 bg-zinc-950 text-zinc-300'
              : theme === 'light'
                ? 'border-gray-200 bg-transparent text-gray-500'
                : theme === 'black'
                  ? 'border-white/12 bg-transparent text-zinc-500'
                  : theme === 'glass'
                    ? 'border-white/10 bg-transparent text-white/52'
                    : 'border-zinc-800 bg-transparent text-zinc-500';

        return (
          <li
            key={item.id}
            className={cn('flex items-center', isCompact ? 'min-w-0 flex-1 gap-1' : 'gap-2')}
          >
            <div
              className={cn(
                'flex min-w-0 items-center border backdrop-blur-xl',
                isCompact ? 'flex-1 justify-center gap-1.5 px-2 py-1.5' : 'gap-3 px-3 py-2',
                navetRadiusTokens.action,
                capsuleClassName
              )}
              style={status === 'current' ? { boxShadow: `0 0 0 1px ${accentColor}26` } : undefined}
            >
              <span
                className={cn(
                  'flex shrink-0 items-center justify-center rounded-full border font-semibold',
                  isCompact ? 'h-5 w-5 text-[10px]' : 'h-6 w-6 text-[11px]',
                  status === 'current'
                    ? 'border-transparent text-white'
                    : status === 'complete'
                      ? theme === 'light'
                        ? 'border-gray-200 bg-white text-gray-700'
                        : 'border-white/12 bg-white/8 text-white/84'
                      : theme === 'light'
                        ? 'border-gray-200 text-gray-500'
                        : 'border-white/10 text-white/52'
                )}
                style={status === 'current' ? { backgroundColor: accentColor } : undefined}
                aria-hidden="true"
              >
                {status === 'complete' ? (
                  <Check className={isCompact ? 'h-3 w-3' : 'h-3.5 w-3.5'} />
                ) : (
                  index + 1
                )}
              </span>
              <div className="min-w-0">
                <div
                  className={cn(
                    'truncate font-medium whitespace-nowrap',
                    isCompact ? 'text-[10px]' : 'text-sm'
                  )}
                >
                  {resolvedLabel}
                </div>
                {item.optional && !isCompact ? (
                  <div className={cn('uppercase tracking-[0.14em] opacity-60', 'text-[11px]')}>
                    Optional
                  </div>
                ) : null}
              </div>
            </div>
            {index < items.length - 1 ? (
              <div
                aria-hidden="true"
                className={cn(
                  isCompact ? 'h-px min-w-1 flex-1' : 'hidden h-px w-6 shrink-0 sm:block',
                  index < currentIndex
                    ? theme === 'light'
                      ? 'bg-gray-300'
                      : 'bg-white/18'
                    : theme === 'light'
                      ? 'bg-gray-200'
                      : 'bg-white/8'
                )}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}
