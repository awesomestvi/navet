import type { ReactNode } from 'react';
import { Text } from '@/app/components/primitives/text';
import { cn } from '@/app/components/ui/utils';

export interface TableCellContentProps {
  primary: ReactNode;
  secondary?: ReactNode;
  align?: 'start' | 'end';
  className?: string;
}

// Status: proposed. Text-only table cell pattern for future list/table work.
// TODO: Keep sortable headers, selection checkboxes, and action cells out of this pattern until real table surfaces exist.
export function TableCellContent({
  primary,
  secondary,
  align = 'start',
  className,
}: TableCellContentProps) {
  return (
    <div className={cn('min-w-0', align === 'end' ? 'text-right' : 'text-left', className)}>
      <Text as="div" className="truncate">
        {primary}
      </Text>
      {secondary ? (
        <Text as="div" tone="muted" className="truncate text-xs">
          {secondary}
        </Text>
      ) : null}
    </div>
  );
}
