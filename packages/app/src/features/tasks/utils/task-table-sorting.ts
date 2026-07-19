import type { AutomationTask, QuickActionRoutine } from '../types';

export type SortDirection = 'asc' | 'desc';
export type AutomationSortKey = 'name' | 'category' | 'status';
export type QuickActionSortKey = 'name' | 'type';

export interface TableSortState<Key extends string> {
  key: Key;
  direction: SortDirection;
}

export function toggleTableSort<Key extends string>(
  current: TableSortState<Key> | null,
  key: Key
): TableSortState<Key> | null {
  if (current?.key === key && current.direction === 'desc') {
    return null;
  }

  return {
    key,
    direction: current?.key === key && current.direction === 'asc' ? 'desc' : 'asc',
  };
}

function compareText(left: string, right: string, locale?: string) {
  return left.localeCompare(right, locale, { sensitivity: 'base' });
}

function compareOptionalText(
  left: string | undefined,
  right: string | undefined,
  direction: SortDirection,
  locale?: string
) {
  if (!left && !right) {
    return 0;
  }
  if (!left) {
    return 1;
  }
  if (!right) {
    return -1;
  }

  const comparison = compareText(left, right, locale);
  return direction === 'asc' ? comparison : -comparison;
}

export function sortAutomationTasks<T extends AutomationTask>(
  automations: T[],
  sort: TableSortState<AutomationSortKey> | null,
  locale?: string
): T[] {
  if (!sort) {
    return automations;
  }

  const statusOrder: Record<AutomationTask['status'], number> = {
    active: 0,
    attention: 1,
    disabled: 2,
  };

  return automations
    .map((automation, index) => ({ automation, index }))
    .sort((left, right) => {
      let comparison = 0;

      if (sort.key === 'name') {
        comparison = compareText(left.automation.name, right.automation.name, locale);
        if (sort.direction === 'desc') {
          comparison = -comparison;
        }
      } else if (sort.key === 'category') {
        comparison = compareOptionalText(
          left.automation.category,
          right.automation.category,
          sort.direction,
          locale
        );
      } else {
        comparison = statusOrder[left.automation.status] - statusOrder[right.automation.status];
        if (sort.direction === 'desc') {
          comparison = -comparison;
        }
      }

      return comparison || left.index - right.index;
    })
    .map(({ automation }) => automation);
}

export function sortQuickActions(
  actions: QuickActionRoutine[],
  sort: TableSortState<QuickActionSortKey> | null,
  locale?: string
) {
  if (!sort) {
    return actions;
  }

  return actions
    .map((action, index) => ({ action, index }))
    .sort((left, right) => {
      const leftValue = sort.key === 'name' ? left.action.name : left.action.type;
      const rightValue = sort.key === 'name' ? right.action.name : right.action.type;
      const comparison = compareText(leftValue, rightValue, locale);

      return (sort.direction === 'asc' ? comparison : -comparison) || left.index - right.index;
    })
    .map(({ action }) => action);
}
