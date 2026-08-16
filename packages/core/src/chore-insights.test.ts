import { describe, expect, it, vi } from 'vitest';
import {
  applyChoreHistoryRetention,
  buildChoreWeeklyReport,
  calculateChoreInsights,
  exportChoreHistory,
  filterChoreHistory,
  suggestChoreWorkloadBalance,
} from './chore-insights';
import type { ChoreActivity, ChoreWorkspaceData } from './chores';

const events: ChoreActivity[] = [
  {
    id: 'due-1',
    commandId: 'due-1',
    occurrenceId: 'one',
    definitionId: 'dishes',
    type: 'due',
    assigneeIds: ['maya'],
    timestamp: '2026-08-10T10:00:00.000Z',
  },
  {
    id: 'overdue-1',
    commandId: 'overdue-1',
    occurrenceId: 'one',
    definitionId: 'dishes',
    type: 'overdue',
    assigneeIds: ['maya'],
    timestamp: '2026-08-10T10:00:00.000Z',
  },
  {
    id: 'complete-1',
    commandId: 'complete-1',
    occurrenceId: 'one',
    definitionId: 'dishes',
    type: 'completed',
    actorParticipantId: 'maya',
    timestamp: '2026-08-10T11:00:00.000Z',
  },
  {
    id: 'approve-1',
    commandId: 'approve-1',
    occurrenceId: 'one',
    definitionId: 'dishes',
    type: 'approved',
    actorParticipantId: 'sofia',
    timestamp: '2026-08-10T11:30:00.000Z',
  },
  {
    id: 'due-2',
    commandId: 'due-2',
    occurrenceId: 'two',
    definitionId: 'trash',
    type: 'due',
    assigneeIds: ['maya'],
    timestamp: '2026-08-11T10:00:00.000Z',
  },
  {
    id: 'complete-2',
    commandId: 'complete-2',
    occurrenceId: 'two',
    definitionId: 'trash',
    type: 'completed',
    actorParticipantId: 'maya',
    timestamp: '2026-08-11T11:00:00.000Z',
  },
  {
    id: 'due-3',
    commandId: 'due-3',
    occurrenceId: 'three',
    definitionId: 'laundry',
    type: 'due',
    assigneeIds: ['maya'],
    timestamp: '2026-08-12T10:00:00.000Z',
  },
  {
    id: 'due-4',
    commandId: 'due-4',
    occurrenceId: 'four',
    definitionId: 'plants',
    type: 'due',
    assigneeIds: ['sofia'],
    timestamp: '2026-08-12T10:00:00.000Z',
  },
];

describe('chore insights', () => {
  it('calculates household and per-profile rates, turnaround, streak, and workload', () => {
    const result = calculateChoreInsights({
      events,
      participantIds: ['maya', 'sofia'],
      from: '2026-08-10T00:00:00.000Z',
      to: '2026-08-16T23:59:59.999Z',
    });
    expect(result.household).toMatchObject({
      due: 4,
      completed: 2,
      overdue: 1,
      completionRate: 50,
      overdueRate: 25,
      approvalTurnaroundMinutes: 30,
      streakDays: 2,
    });
    expect(result.profiles[0]).toMatchObject({
      participantId: 'maya',
      assigned: 3,
      contributions: 2,
      completionRate: 66.7,
    });
    expect(result.workload).toMatchObject({ status: 'uneven', spread: 2 });
    expect(suggestChoreWorkloadBalance(result)).toEqual([
      expect.objectContaining({
        fromParticipantId: 'maya',
        toParticipantId: 'sofia',
        difference: 2,
      }),
    ]);
  });

  it('builds a weekly review from history and current projections', () => {
    const workspace = {
      schemaVersion: 2,
      participantsById: {},
      definitionsById: {},
      occurrencesById: {
        approval: {
          id: 'approval',
          definitionId: 'dishes',
          scheduledAt: '2026-08-12T08:00:00.000Z',
          dueAt: '2026-08-12T10:00:00.000Z',
          assigneeIds: ['maya'],
          assignmentSlot: 'maya',
          status: 'awaiting_approval',
          updatedAt: '2026-08-12T09:00:00.000Z',
        },
        next: {
          id: 'next',
          definitionId: 'trash',
          scheduledAt: '2026-08-18T08:00:00.000Z',
          dueAt: '2026-08-18T10:00:00.000Z',
          assigneeIds: ['sofia'],
          assignmentSlot: 'sofia',
          status: 'available',
          updatedAt: '2026-08-12T09:00:00.000Z',
        },
      },
      activity: [],
      outbox: [],
    } satisfies ChoreWorkspaceData;
    expect(
      buildChoreWeeklyReport({ workspace, events, now: '2026-08-12T12:00:00.000Z' })
    ).toMatchObject({
      completed: 2,
      pendingApproval: 1,
      nextWeek: 1,
    });
  });

  it('filters, exports, deduplicates, and bounds retained history', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-08-14T00:00:00.000Z'));
    expect(filterChoreHistory([...events, events[0]], { participantId: 'sofia' })).toHaveLength(2);
    expect(exportChoreHistory(events, 'json', { types: ['approved'] })).toContain('approve-1');
    expect(exportChoreHistory(events, 'csv', { definitionId: 'dishes' })).toContain('"overdue"');
    const many = Array.from({ length: 1001 }, (_, index) => ({
      ...events[0],
      id: `event-${index}`,
      commandId: `event-${index}`,
    }));
    expect(
      applyChoreHistoryRetention(
        many,
        { maxAgeDays: 30, maxEvents: 1000 },
        '2026-08-14T00:00:00.000Z'
      )
    ).toHaveLength(1000);
    vi.useRealTimers();
  });
});
