import type { ChoreDefinition, ChoreOccurrence, ChoreWorkspaceData } from '@navet/core/chores';
import { describe, expect, it } from 'vitest';
import { archiveChoreDefinition } from './chore-workspace-model';

const createdAt = '2026-08-01T08:00:00.000Z';
const archivedAt = '2026-08-12T08:00:00.000Z';

function definition(): ChoreDefinition {
  return {
    id: 'dishes',
    title: 'Empty the dishwasher',
    enabled: true,
    assignment: { mode: 'anyone', participantIds: ['alex'] },
    schedule: {
      frequency: 'daily',
      startDate: '2026-08-01',
      time: '18:00',
      timeZone: 'Europe/Stockholm',
    },
    dueWindowMinutes: 60,
    approval: { required: false, approverIds: [] },
    createdAt,
    updatedAt: createdAt,
  };
}

function occurrence(id: string, status: ChoreOccurrence['status']): ChoreOccurrence {
  return {
    id,
    definitionId: 'dishes',
    scheduledAt: '2026-08-12T16:00:00.000Z',
    dueAt: '2026-08-12T17:00:00.000Z',
    assigneeIds: ['alex'],
    assignmentSlot: 'shared',
    status,
    updatedAt: createdAt,
  };
}

describe('archiveChoreDefinition', () => {
  it('stops the chore, removes unfinished occurrences, and keeps completed history', () => {
    const data: ChoreWorkspaceData = {
      schemaVersion: 1,
      participantsById: {},
      definitionsById: { dishes: definition() },
      occurrencesById: {
        upcoming: occurrence('upcoming', 'available'),
        completed: occurrence('completed', 'done'),
        skipped: occurrence('skipped', 'skipped'),
      },
      activity: [],
    };

    const archived = archiveChoreDefinition(data, 'dishes', archivedAt);

    expect(archived.definitionsById.dishes).toMatchObject({
      archivedAt,
      enabled: false,
      updatedAt: archivedAt,
    });
    expect(Object.keys(archived.occurrencesById)).toEqual(['completed', 'skipped']);
    expect(data.definitionsById.dishes?.archivedAt).toBeUndefined();
    expect(data.occurrencesById.upcoming).toBeDefined();
  });

  it('rejects deletion when the chore no longer exists', () => {
    const data: ChoreWorkspaceData = {
      schemaVersion: 1,
      participantsById: {},
      definitionsById: {},
      occurrencesById: {},
      activity: [],
    };

    expect(() => archiveChoreDefinition(data, 'missing', archivedAt)).toThrow(
      'Chore is no longer available'
    );
  });
});
