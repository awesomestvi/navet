import { describe, expect, it } from 'vitest';
import {
  applyChoreOccurrenceCommand,
  type ChoreDefinition,
  type ChoreOccurrence,
  type ChoreParticipant,
  createEmptyChoreWorkspace,
  getChoreTiming,
  isChoreWorkspaceData,
  materializeChoreOccurrences,
} from './chores';

const alice: ChoreParticipant = {
  id: 'alice',
  displayName: 'Alice',
  capabilities: ['complete', 'approve', 'manage'],
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
};

const bob: ChoreParticipant = {
  id: 'bob',
  displayName: 'Bob',
  capabilities: ['complete'],
  createdAt: '2026-08-01T08:00:00.000Z',
  updatedAt: '2026-08-01T08:00:00.000Z',
};

function makeDefinition(overrides: Partial<ChoreDefinition> = {}): ChoreDefinition {
  return {
    id: 'take-out-recycling',
    title: 'Take out recycling',
    enabled: true,
    assignment: {
      mode: 'rotation',
      participantIds: ['alice', 'bob'],
    },
    schedule: {
      frequency: 'weekly',
      startDate: '2026-08-01',
      time: '18:00',
      timeZone: 'Europe/Stockholm',
      daysOfWeek: [1],
    },
    dueWindowMinutes: 180,
    approval: { required: false, approverIds: [] },
    createdAt: '2026-08-01T08:00:00.000Z',
    updatedAt: '2026-08-01T08:00:00.000Z',
    ...overrides,
  };
}

function makeOccurrence(overrides: Partial<ChoreOccurrence> = {}): ChoreOccurrence {
  return {
    id: 'take-out-recycling:2026-08-10T16:00:00.000Z:alice',
    definitionId: 'take-out-recycling',
    scheduledAt: '2026-08-10T16:00:00.000Z',
    dueAt: '2026-08-10T19:00:00.000Z',
    assigneeIds: ['alice'],
    assignmentSlot: 'alice',
    status: 'available',
    updatedAt: '2026-08-10T16:00:00.000Z',
    ...overrides,
  };
}

describe('chores domain', () => {
  it('creates an empty versioned workspace', () => {
    expect(createEmptyChoreWorkspace()).toEqual({
      schemaVersion: 1,
      participantsById: {},
      definitionsById: {},
      occurrencesById: {},
      activity: [],
    });
  });

  it('materializes weekly rotation occurrences with DST-safe local times', () => {
    const occurrences = materializeChoreOccurrences({
      definition: makeDefinition(),
      participantsById: { alice, bob },
      rangeStart: '2026-08-01T00:00:00.000Z',
      rangeEnd: '2026-08-17T00:00:00.000Z',
    });

    expect(occurrences).toHaveLength(2);
    expect(occurrences.map((occurrence) => occurrence.assigneeIds)).toEqual([['alice'], ['bob']]);
    expect(occurrences.map((occurrence) => occurrence.scheduledAt)).toEqual([
      '2026-08-03T16:00:00.000Z',
      '2026-08-10T16:00:00.000Z',
    ]);

    const laterOccurrence = materializeChoreOccurrences({
      definition: makeDefinition(),
      participantsById: { alice, bob },
      rangeStart: '2026-08-17T00:00:00.000Z',
      rangeEnd: '2026-08-18T00:00:00.000Z',
    });
    expect(laterOccurrence[0]?.assigneeIds).toEqual(['alice']);
  });

  it('creates one occurrence per active participant for everyone assignments', () => {
    const occurrences = materializeChoreOccurrences({
      definition: makeDefinition({
        assignment: { mode: 'everyone', participantIds: ['alice', 'bob'] },
        schedule: {
          frequency: 'once',
          date: '2026-08-10',
          time: '18:00',
          timeZone: 'Europe/Stockholm',
        },
      }),
      participantsById: { alice, bob },
      rangeStart: '2026-08-10T00:00:00.000Z',
      rangeEnd: '2026-08-11T00:00:00.000Z',
    });

    expect(occurrences.map((occurrence) => occurrence.assignmentSlot)).toEqual(['alice', 'bob']);
  });

  it('keeps after-completion schedules to the single next occurrence', () => {
    const occurrences = materializeChoreOccurrences({
      definition: makeDefinition({
        assignment: { mode: 'person', participantIds: ['alice'] },
        schedule: {
          frequency: 'after_completion',
          startDate: '2026-08-01',
          time: '18:00',
          timeZone: 'Europe/Stockholm',
          intervalDays: 3,
        },
      }),
      participantsById: { alice },
      rangeStart: '2026-08-01T00:00:00.000Z',
      rangeEnd: '2026-09-01T00:00:00.000Z',
      latestCompletedAt: '2026-08-10T19:00:00.000Z',
    });

    expect(occurrences).toHaveLength(1);
    expect(occurrences[0]?.scheduledAt).toBe('2026-08-13T16:00:00.000Z');
  });

  it('rejects malformed nested workspace data', () => {
    expect(
      isChoreWorkspaceData({
        ...createEmptyChoreWorkspace(),
        participantsById: {
          alice: { ...alice, capabilities: ['admin'] },
        },
      })
    ).toBe(false);
  });

  it('preserves an existing occurrence when a range is materialized again', () => {
    const existing = makeOccurrence({ status: 'done', completedBy: 'alice' });
    const occurrences = materializeChoreOccurrences({
      definition: makeDefinition({
        assignment: { mode: 'person', participantIds: ['alice'] },
        schedule: {
          frequency: 'once',
          date: '2026-08-10',
          time: '18:00',
          timeZone: 'Europe/Stockholm',
        },
      }),
      participantsById: { alice },
      rangeStart: '2026-08-10T00:00:00.000Z',
      rangeEnd: '2026-08-11T00:00:00.000Z',
      existingOccurrences: { [existing.id]: existing },
    });

    expect(occurrences).toEqual([existing]);
  });

  it('keeps timing separate from workflow status', () => {
    const occurrence = makeOccurrence();
    expect(getChoreTiming(occurrence, new Date('2026-08-10T15:00:00.000Z'))).toBe('upcoming');
    expect(getChoreTiming(occurrence, new Date('2026-08-10T17:00:00.000Z'))).toBe('due');
    expect(getChoreTiming(occurrence, new Date('2026-08-10T20:00:00.000Z'))).toBe('overdue');
    expect(
      getChoreTiming({ ...occurrence, status: 'done' }, new Date('2026-08-10T20:00:00.000Z'))
    ).toBe('due');
  });

  it('routes completion through approval when required', () => {
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['bob'] },
      approval: { required: true, approverIds: ['alice'] },
    });
    const occurrence = makeOccurrence({ assigneeIds: ['bob'], assignmentSlot: 'bob' });

    const completed = applyChoreOccurrenceCommand({
      commandId: 'command-complete',
      command: { type: 'complete', participantId: 'bob' },
      definition,
      occurrence,
      timestamp: '2026-08-10T18:10:00.000Z',
    });
    expect(completed.occurrence.status).toBe('awaiting_approval');

    const approved = applyChoreOccurrenceCommand({
      commandId: 'command-approve',
      command: { type: 'approve', participantId: 'alice' },
      definition,
      occurrence: completed.occurrence,
      timestamp: '2026-08-10T18:15:00.000Z',
    });
    expect(approved.occurrence.status).toBe('done');
    expect(approved.activity.type).toBe('approved');
  });

  it('does not let another participant complete a claimed occurrence', () => {
    expect(() =>
      applyChoreOccurrenceCommand({
        commandId: 'command-complete',
        command: { type: 'complete', participantId: 'bob' },
        definition: makeDefinition({
          assignment: { mode: 'anyone', participantIds: ['alice', 'bob'] },
        }),
        occurrence: makeOccurrence({
          assigneeIds: ['alice', 'bob'],
          assignmentSlot: 'shared',
          status: 'claimed',
          claimedBy: 'alice',
        }),
        timestamp: '2026-08-10T18:15:00.000Z',
      })
    ).toThrow('claimant');
  });
});
