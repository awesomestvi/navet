import {
  SortableTableHeader as PrimitiveSortableTableHeader,
  type TableSortDirection,
} from '@navet/app/components/primitives';
import { useI18n } from '@navet/app/hooks';
import type { SortDirection } from '../utils/task-table-sorting';

interface SortableTableHeaderProps {
  label: string;
  direction?: SortDirection;
  onToggle: () => void;
}

export function SortableTableHeader({ label, direction, onToggle }: SortableTableHeaderProps) {
  const { t } = useI18n();
  const ariaLabel = direction
    ? t(direction === 'asc' ? 'tasks.sort.sortedAscending' : 'tasks.sort.sortedDescending', {
        column: label,
      })
    : t('tasks.sort.by', { column: label });

  return (
    <PrimitiveSortableTableHeader
      label={label}
      direction={direction as TableSortDirection | undefined}
      ariaLabel={ariaLabel}
      onClick={onToggle}
    />
  );
}
