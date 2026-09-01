import { describe, expect, it } from 'vitest';
import {
  applyIntelligencePriorityRanking,
  type IntelligencePriorityCandidate,
  prepareIntelligencePriorityCandidates,
} from './intelligence-priorities';

const now = new Date('2026-09-01T08:00:00.000Z');
function candidate(
  id: string,
  urgencyGroup: IntelligencePriorityCandidate['urgencyGroup'],
  expiresAt = '2026-09-02T08:00:00.000Z'
): IntelligencePriorityCandidate {
  return {
    id,
    source: 'chores',
    reasonCode: urgencyGroup === 'due_today' ? 'chore_due_today' : 'chore_overdue',
    priority: 'attention',
    urgencyGroup,
    createdAt: now.toISOString(),
    expiresAt,
    sourceReference: { section: 'tasks', occurrenceId: id },
    sharedDisplayPolicy: 'safe',
    facts: {},
  };
}

describe('intelligence priorities', () => {
  it('deduplicates, removes expired candidates, and preserves stable urgency ordering', () => {
    expect(
      prepareIntelligencePriorityCandidates(
        [
          candidate('today', 'due_today'),
          candidate('expired', 'advisory', '2026-08-31T08:00:00.000Z'),
          candidate('overdue', 'overdue_or_approval'),
          { ...candidate('unsupported', 'due_today'), providerSupported: false },
          candidate('today', 'due_today'),
        ],
        now
      ).map((item) => item.id)
    ).toEqual(['overdue', 'today']);
  });

  it('accepts model ordering only inside the immutable urgency group', () => {
    const items = [candidate('first', 'due_today'), candidate('second', 'due_today')];
    const tokens = new Map([
      ['first', 'opaque-a'],
      ['second', 'opaque-b'],
    ]);
    expect(
      applyIntelligencePriorityRanking(items, ['opaque-b', 'opaque-a'], tokens)?.map((i) => i.id)
    ).toEqual(['second', 'first']);
  });

  it('rejects omission, unknown tokens, duplicates, and priority crossings', () => {
    const items = [
      candidate('critical', 'active_critical_safety'),
      candidate('today', 'due_today'),
    ];
    const tokens = new Map([
      ['critical', 'opaque-a'],
      ['today', 'opaque-b'],
    ]);
    expect(applyIntelligencePriorityRanking(items, ['opaque-b', 'opaque-a'], tokens)).toBeNull();
    expect(applyIntelligencePriorityRanking(items, ['opaque-a'], tokens)).toBeNull();
    expect(applyIntelligencePriorityRanking(items, ['opaque-a', 'unknown'], tokens)).toBeNull();
  });
});
