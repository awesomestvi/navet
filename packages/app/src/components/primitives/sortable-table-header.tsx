import { getThemeFocusRingClassName } from '@navet/app/components/system/tokens';
import { cn } from '@navet/app/components/ui/utils';
import { useTheme } from '@navet/app/hooks/use-theme';
import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react';
import type { ButtonHTMLAttributes } from 'react';

export type TableSortDirection = 'asc' | 'desc';

export interface SortableTableHeaderProps
  extends Omit<ButtonHTMLAttributes<HTMLButtonElement>, 'aria-label' | 'children'> {
  label: string;
  direction?: TableSortDirection;
  ariaLabel: string;
}

// Status: in-progress. Canonical sort control for compact Navet table headers.
export function SortableTableHeader({
  label,
  direction,
  ariaLabel,
  className,
  ...props
}: SortableTableHeaderProps) {
  const { theme } = useTheme();
  const SortIcon = direction === 'asc' ? ArrowUp : direction === 'desc' ? ArrowDown : ArrowUpDown;

  return (
    <button
      {...props}
      type="button"
      aria-label={ariaLabel}
      data-sort-direction={direction ?? 'none'}
      className={cn(
        'group inline-flex w-full appearance-none items-center gap-1 rounded-none border-0 bg-transparent p-0 text-left text-inherit [font:inherit] transition-colors hover:text-current',
        getThemeFocusRingClassName(theme),
        className
      )}
    >
      <span className="truncate">{label}</span>
      <SortIcon
        className={cn(
          'h-3 w-3 shrink-0 transition-opacity',
          direction ? 'opacity-90' : 'opacity-40 group-hover:opacity-70'
        )}
        aria-hidden="true"
      />
    </button>
  );
}
