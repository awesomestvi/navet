import {
  getThemeFocusRingClassName,
  getThemeSurfaceTokens,
  navetRadiusTokens,
} from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useI18n, useTheme } from '@navet/app/hooks';
import { Check } from 'lucide-react';
import { type ReactNode, useMemo } from 'react';

export interface StepperItem {
  id: string;
  label: string;
  compactLabel?: string;
  summary?: string;
  optional?: boolean;
  disabled?: boolean;
}

export interface StepperProps {
  items: StepperItem[];
  currentStep: number;
  ariaLabel?: string;
  className?: string;
  controlsId?: string;
  onStepChange?: (step: number) => void;
  orientation?: 'horizontal' | 'vertical';
  size?: 'default' | 'compact';
}

// Status: in-progress. Shared stepper for short setup and onboarding flows.
export function Stepper({
  items,
  currentStep,
  ariaLabel,
  className,
  controlsId,
  onStepChange,
  orientation = 'horizontal',
  size = 'default',
}: StepperProps) {
  const { theme, accentColor } = useTheme();
  const { t } = useI18n();
  const surface = getThemeSurfaceTokens(theme);
  const currentIndex = useMemo(
    () => Math.max(0, Math.min(items.length - 1, currentStep)),
    [currentStep, items.length]
  );
  const isCompact = size === 'compact';
  const isVertical = orientation === 'vertical';

  const steps = (
    <ol
      className={cn(
        isVertical
          ? 'flex w-full flex-col'
          : isCompact
            ? 'grid w-full gap-2'
            : 'flex items-center gap-2 overflow-x-auto pb-1 scrollbar-hide'
      )}
      style={
        !isVertical && isCompact
          ? { gridTemplateColumns: `repeat(${items.length}, minmax(0, 1fr))` }
          : undefined
      }
    >
      {items.map((item, index) => {
        const status =
          index < currentIndex ? 'complete' : index === currentIndex ? 'current' : 'upcoming';
        const resolvedLabel = isCompact ? (item.compactLabel ?? item.label) : item.label;
        const interactive = Boolean(onStepChange);
        const controlClassName = cn(
          'relative flex min-w-0 items-center border text-left transition-[background-color,border-color,opacity] motion-reduce:transition-none',
          navetRadiusTokens.action,
          getThemeFocusRingClassName(theme),
          isVertical
            ? 'min-h-16 w-full gap-3 px-3 py-2.5'
            : isCompact
              ? 'min-h-11 w-full justify-center gap-1 px-1 py-1.5'
              : 'min-h-11 gap-3 px-3 py-2',
          status === 'current' || !isVertical ? surface.borderStrong : 'border-transparent',
          status !== 'current' && interactive && !item.disabled ? surface.hoverBg : '',
          status === 'upcoming' ? surface.textMuted : surface.textPrimary,
          item.disabled ? 'cursor-not-allowed opacity-45' : interactive ? 'cursor-pointer' : ''
        );
        const controlStyle =
          status === 'current' ? { backgroundColor: `${accentColor}14` } : undefined;
        const accessibleLabel = `${index + 1}/${items.length} ${item.label}${
          item.summary ? `: ${item.summary}` : ''
        }`;
        const content: ReactNode = (
          <>
            {status === 'current' && isVertical ? (
              <span
                className="absolute inset-y-3 left-0 w-1 rounded-full"
                style={{ backgroundColor: accentColor }}
                aria-hidden="true"
              />
            ) : null}
            <span
              className={cn(
                'flex shrink-0 items-center justify-center rounded-full border font-semibold',
                isCompact ? 'h-5 w-5 text-[10px]' : 'h-9 w-9 text-xs',
                surface.borderStrong,
                status === 'complete' ? surface.iconBg : '',
                status === 'upcoming' ? surface.textMuted : ''
              )}
              style={
                status === 'current'
                  ? { backgroundColor: accentColor, color: 'white' }
                  : status === 'complete'
                    ? { color: accentColor }
                    : undefined
              }
              aria-hidden="true"
            >
              {status === 'complete' ? (
                <Check className={isCompact ? 'h-3 w-3' : 'h-4 w-4'} />
              ) : (
                index + 1
              )}
            </span>
            <span className={cn('min-w-0', isCompact ? '' : 'flex-1')}>
              <span
                className={cn(
                  'block truncate font-semibold whitespace-nowrap',
                  isCompact ? 'text-[10px] min-[360px]:text-xs' : 'text-sm'
                )}
              >
                {resolvedLabel}
              </span>
              {item.summary && isVertical ? (
                <span className={cn('mt-0.5 block truncate text-xs', surface.textMuted)}>
                  {item.summary}
                </span>
              ) : null}
              {item.optional && !isCompact && !isVertical ? (
                <span className={cn('mt-0.5 block text-xs', surface.textMuted)}>
                  {t('common.optional')}
                </span>
              ) : null}
            </span>
          </>
        );

        return (
          <li
            key={item.id}
            className={cn(
              isVertical
                ? 'relative pb-2 last:pb-0'
                : isCompact
                  ? 'min-w-0'
                  : 'flex shrink-0 items-center gap-2'
            )}
          >
            {isVertical && index < items.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn(
                  'absolute top-12 bottom-[-0.5rem] left-[1.875rem] border-l',
                  surface.borderStrong
                )}
                style={status === 'complete' ? { borderColor: accentColor } : undefined}
              />
            ) : null}
            {interactive ? (
              <button
                type="button"
                disabled={item.disabled}
                aria-controls={controlsId}
                aria-current={status === 'current' ? 'step' : undefined}
                aria-label={accessibleLabel}
                data-state={status}
                onClick={() => onStepChange?.(index)}
                className={cn(controlClassName, isVertical ? 'z-10' : '')}
                style={controlStyle}
              >
                {content}
              </button>
            ) : (
              <div
                data-state={status}
                className={cn(controlClassName, isVertical ? 'z-10' : '')}
                style={controlStyle}
              >
                {content}
              </div>
            )}
            {!isVertical && !isCompact && index < items.length - 1 ? (
              <span
                aria-hidden="true"
                className={cn('w-6 shrink-0 border-t', surface.borderStrong)}
                style={status === 'complete' ? { borderColor: accentColor } : undefined}
              />
            ) : null}
          </li>
        );
      })}
    </ol>
  );

  return ariaLabel ? (
    <nav aria-label={ariaLabel} className={className}>
      {steps}
    </nav>
  ) : (
    <div className={className}>{steps}</div>
  );
}
