import { describe, expect, it } from 'vitest';
import { buildChoreProjectionSnapshot } from './chore-projection';
import { createEmptyChoreWorkspace } from './chores';

describe('chore projection', () => {
  it('builds a small provider-neutral summary without exposing internal fields as entities', () => {
    const workspace = createEmptyChoreWorkspace();
    workspace.definitionsById.dishes = {
      id: 'dishes',
      title: 'Empty dishes',
      enabled: true,
      assignment: { mode: 'anyone', participantIds: [] },
      schedule: {
        frequency: 'daily',
        startDate: '2026-08-14',
        time: '18:00',
        timeZone: 'UTC',
      },
      dueWindowMinutes: 60,
      approval: { required: false, approverIds: [] },
      createdAt: '2026-08-14T00:00:00.000Z',
      updatedAt: '2026-08-14T00:00:00.000Z',
    };
    workspace.occurrencesById.one = {
      id: 'one',
      definitionId: 'dishes',
      scheduledAt: '2026-08-14T17:00:00.000Z',
      dueAt: '2026-08-14T18:00:00.000Z',
      assigneeIds: [],
      assignmentSlot: 'anyone',
      status: 'available',
      updatedAt: '2026-08-14T17:00:00.000Z',
    };

    expect(
      buildChoreProjectionSnapshot({
        workspace,
        revision: 3,
        now: '2026-08-14T18:30:00.000Z',
      })
    ).toMatchObject({
      contractVersion: 1,
      revision: 3,
      state: 'overdue',
      counts: { dueNow: 0, overdue: 1 },
      next: [{ id: 'one', title: 'Empty dishes', timing: 'overdue' }],
    });
  });
});
