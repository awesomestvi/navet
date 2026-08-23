import { describe, expect, it } from 'vitest';
import { sortOperationalItems } from './operational-signal';

describe('sortOperationalItems', () => {
  it('orders critical, attention, and current items while preserving order within a priority', () => {
    expect(
      sortOperationalItems([
        { id: 'current-one' },
        { id: 'attention-one', priority: 'attention' as const },
        { id: 'current-two', priority: 'current' as const },
        { id: 'critical', priority: 'critical' as const },
        { id: 'attention-two', priority: 'attention' as const },
      ]).map((item) => item.id)
    ).toEqual(['critical', 'attention-one', 'attention-two', 'current-one', 'current-two']);
  });

  it('does not mutate caller-owned arrays', () => {
    const source = [{ id: 'current' }, { id: 'attention', priority: 'attention' as const }];
    sortOperationalItems(source);
    expect(source.map((item) => item.id)).toEqual(['current', 'attention']);
  });
});
