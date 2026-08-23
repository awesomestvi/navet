export type OperationalPriority = 'critical' | 'attention' | 'current';

export type OperationalTone = 'danger' | 'warning' | 'success' | 'active' | 'neutral';

export interface OperationalPriorityItem {
  priority?: OperationalPriority;
}

const OPERATIONAL_PRIORITY_ORDER: Record<OperationalPriority, number> = {
  critical: 0,
  attention: 1,
  current: 2,
};

export function getOperationalPriorityRank(priority: OperationalPriority | undefined) {
  return OPERATIONAL_PRIORITY_ORDER[priority ?? 'current'];
}

/**
 * Keeps caller order within each priority so domain-owned and user-owned ordering remains stable.
 */
export function sortOperationalItems<T extends OperationalPriorityItem>(items: readonly T[]): T[] {
  return items
    .map((item, index) => ({ item, index }))
    .sort(
      (left, right) =>
        getOperationalPriorityRank(left.item.priority) -
          getOperationalPriorityRank(right.item.priority) || left.index - right.index
    )
    .map(({ item }) => item);
}
