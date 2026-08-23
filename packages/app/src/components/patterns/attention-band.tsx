import { getThemeSurfaceTokens } from '@navet/app/components/shared/theme/theme-surface-tokens';
import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks';
import {
  type OperationalPriority,
  sortOperationalItems,
} from '@navet/app/types/operational-signal';
import { ChevronRight, type LucideIcon } from 'lucide-react';
import { memo, useMemo } from 'react';

export interface AttentionBandItem {
  id: string;
  title: string;
  detail?: string;
  priority: Extract<OperationalPriority, 'critical' | 'attention'>;
  icon: LucideIcon;
  actionLabel?: string;
}

export interface AttentionBandProps {
  items: readonly AttentionBandItem[];
  ariaLabel: string;
  onSelect?: (item: AttentionBandItem) => void;
  className?: string;
  maxVisibleItems?: number;
}

function getBandClassName(hasCritical: boolean, theme: ReturnType<typeof useTheme>['theme']) {
  if (hasCritical) {
    return theme === 'light' ? 'border-red-300/90 bg-red-50/92' : 'border-red-500/34 bg-red-500/10';
  }

  return theme === 'light'
    ? 'border-amber-300/90 bg-amber-50/92'
    : 'border-amber-500/30 bg-amber-500/10';
}

function getItemColorClassName(
  priority: AttentionBandItem['priority'],
  theme: ReturnType<typeof useTheme>['theme']
) {
  if (priority === 'critical') {
    return theme === 'light' ? 'text-red-700' : 'text-red-200';
  }

  return theme === 'light' ? 'text-amber-800' : 'text-amber-200';
}

export const AttentionBand = memo(function AttentionBand({
  items,
  ariaLabel,
  onSelect,
  className,
  maxVisibleItems = 4,
}: AttentionBandProps) {
  const { theme } = useTheme();
  const surface = getThemeSurfaceTokens(theme);
  const orderedItems = useMemo(
    () => sortOperationalItems(items).slice(0, maxVisibleItems),
    [items, maxVisibleItems]
  );

  if (orderedItems.length === 0) {
    return null;
  }

  const hasCritical = orderedItems.some((item) => item.priority === 'critical');

  return (
    <section
      aria-label={ariaLabel}
      aria-live={hasCritical ? 'assertive' : 'polite'}
      role={hasCritical ? 'alert' : 'status'}
      className={cn(
        'overflow-hidden rounded-[22px] border',
        getBandClassName(hasCritical, theme),
        className
      )}
      data-attention-priority={hasCritical ? 'critical' : 'attention'}
    >
      <div className={cn('divide-y', surface.divider)}>
        {orderedItems.map((item) => {
          const Icon = item.icon;
          const content = (
            <>
              <span
                className={cn(
                  'flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-current/18 bg-current/[0.08]',
                  getItemColorClassName(item.priority, theme)
                )}
              >
                <Icon className="h-4 w-4" aria-hidden="true" />
              </span>
              <span className="min-w-0 flex-1">
                <span className={cn('block truncate text-sm font-semibold', surface.textPrimary)}>
                  {item.title}
                </span>
                {item.detail ? (
                  <span className={cn('mt-0.5 block text-xs leading-5', surface.textSecondary)}>
                    {item.detail}
                  </span>
                ) : null}
              </span>
              {item.actionLabel ? (
                <span className={cn('shrink-0 text-xs font-semibold', surface.textSecondary)}>
                  {item.actionLabel}
                </span>
              ) : null}
              {onSelect ? (
                <ChevronRight className={cn('h-4 w-4 shrink-0', surface.textMuted)} aria-hidden />
              ) : null}
            </>
          );

          return onSelect ? (
            <button
              key={item.id}
              type="button"
              onClick={() => onSelect(item)}
              className={cn(
                'flex min-h-12 w-full items-center gap-3 px-3 py-2.5 text-left transition-colors md:px-4',
                surface.hoverBg,
                getThemeFocusRingClassName(theme)
              )}
            >
              {content}
            </button>
          ) : (
            <div key={item.id} className="flex min-h-12 items-center gap-3 px-3 py-2.5 md:px-4">
              {content}
            </div>
          );
        })}
      </div>
    </section>
  );
});
