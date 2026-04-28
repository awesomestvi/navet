import { Check } from 'lucide-react';
import { useMemo } from 'react';
import { navetRadiusTokens } from '@/app/components/system/tokens';
import { cn } from '@/app/components/ui/utils';
import { useTheme } from '@/app/hooks';

export interface StepperItem {
  id: string;
  label: string;
  optional?: boolean;
}

export interface StepperProps {
  items: StepperItem[];
  currentStep: number;
  className?: string;
}

// Status: in-progress. Compact horizontal stepper for short multi-step flows.
export function Stepper({ items, currentStep, className }: StepperProps) {
  const { theme, accentColor } = useTheme();
  const currentIndex = useMemo(
    () => Math.max(0, Math.min(items.length - 1, currentStep)),
    [currentStep, items.length]
  );

  return (
    <ol className={cn('flex items-center gap-2 overflow-x-auto pb-1', className)}>
      {items.map((item, index) => {
        const status =
          index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
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
          <li key={item.id} className="flex items-center gap-2">
            <div
              className={cn(
                'flex min-w-0 items-center gap-3 border px-3 py-2 backdrop-blur-xl',
                navetRadiusTokens.action,
                capsuleClassName
              )}
              style={status === 'current' ? { boxShadow: `0 0 0 1px ${accentColor}26` } : undefined}
            >
              <span
                className={cn(
                  'flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-[11px] font-semibold',
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
                {status === 'complete' ? <Check className="h-3.5 w-3.5" /> : index + 1}
              </span>
              <div className="min-w-0">
                <div className="truncate text-sm font-medium">{item.label}</div>
                {item.optional ? (
                  <div className="text-[11px] uppercase tracking-[0.14em] opacity-60">Optional</div>
                ) : null}
              </div>
            </div>
            {index < items.length - 1 ? (
              <div
                aria-hidden="true"
                className={cn(
                  'hidden h-px w-6 shrink-0 sm:block',
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
