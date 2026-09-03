import { describe, expect, it } from 'vitest';
import { createChoreExperienceState } from './chore-experience';
import {
  applyChoreOccurrenceCommand,
  applyChoreWorkspaceAction,
  applyChoreWorkspaceOccurrenceCommand,
  type ChoreDefinition,
  type ChoreOccurrence,
  type ChoreParticipant,
  createChoreOutboxItem,
  createEmptyChoreWorkspace,
  getChoreTiming,
  isChoreWorkspaceData,
  materializeChoreOccurrences,
  migrateChoreWorkspaceData,
  runChoreWorkspaceScheduler,
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
      schemaVersion: 2,
      participantsById: {},
      definitionsById: {},
      occurrencesById: {},
      activity: [],
      outbox: [],
      historyRetention: { maxAgeDays: 730, maxEvents: 50_000 },
      experience: {
        version: 1,
        gamificationMode: 'off',
        presentationByDefinitionId: {},
        missionsById: {},
        rewardGoalsById: {},
        earnedPointsByParticipant: {},
        householdBonusPoints: 0,
        awardedMissionIds: [],
      },
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

  it.each([
    [2, ['2026-08-03T09:00:00.000Z', '2026-08-17T09:00:00.000Z']],
    [3, ['2026-08-03T09:00:00.000Z', '2026-08-24T09:00:00.000Z']],
  ])('materializes every %s week schedules', (intervalWeeks, expected) => {
    const occurrences = materializeChoreOccurrences({
      definition: makeDefinition({
        assignment: { mode: 'person', participantIds: ['alice'] },
        schedule: {
          frequency: 'weekly',
          startDate: '2026-08-01',
          time: '09:00',
          timeZone: 'UTC',
          daysOfWeek: [1],
          intervalWeeks,
        },
      }),
      participantsById: { alice },
      rangeStart: '2026-08-01T00:00:00.000Z',
      rangeEnd: '2026-08-31T00:00:00.000Z',
    });

    expect(occurrences.map((occurrence) => occurrence.scheduledAt)).toEqual(expected);
  });

  it.each([
    [2, ['2026-08-27T09:00:00.000Z', '2026-09-10T09:00:00.000Z', '2026-09-24T09:00:00.000Z']],
    [3, ['2026-08-27T09:00:00.000Z', '2026-09-17T09:00:00.000Z']],
    [4, ['2026-08-27T09:00:00.000Z', '2026-09-24T09:00:00.000Z']],
  ])(
    'keeps an every-%s-weeks schedule anchored to its August 27 start',
    (intervalWeeks, expected) => {
      const occurrences = materializeChoreOccurrences({
        definition: makeDefinition({
          assignment: { mode: 'person', participantIds: ['alice'] },
          schedule: {
            frequency: 'weekly',
            startDate: '2026-08-27',
            time: '09:00',
            timeZone: 'UTC',
            daysOfWeek: [4],
            intervalWeeks,
          },
        }),
        participantsById: { alice },
        rangeStart: '2026-08-27T00:00:00.000Z',
        rangeEnd: '2026-09-30T00:00:00.000Z',
      });

      expect(occurrences.map((occurrence) => occurrence.scheduledAt)).toEqual(expected);
      expect(
        occurrences.some((occurrence) => occurrence.scheduledAt.startsWith('2026-09-02'))
      ).toBe(false);
    }
  );

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

  it('supports bounded every-N-day schedules, exclusions, and multiple times', () => {
    const occurrences = materializeChoreOccurrences({
      definition: makeDefinition({
        assignment: { mode: 'person', participantIds: ['alice'] },
        schedule: {
          frequency: 'daily',
          startDate: '2026-08-01',
          endDate: '2026-08-05',
          excludedDates: ['2026-08-03'],
          intervalDays: 2,
          time: '09:00',
          times: ['09:00', '18:00'],
          timeZone: 'UTC',
        },
      }),
      participantsById: { alice },
      rangeStart: '2026-08-01T00:00:00.000Z',
      rangeEnd: '2026-08-06T00:00:00.000Z',
    });

    expect(occurrences.map((occurrence) => occurrence.scheduledAt)).toEqual([
      '2026-08-01T09:00:00.000Z',
      '2026-08-01T18:00:00.000Z',
      '2026-08-05T09:00:00.000Z',
      '2026-08-05T18:00:00.000Z',
    ]);
  });

  it('supports nth-weekday monthly schedules and per-participant time variants', () => {
    const monthly = materializeChoreOccurrences({
      definition: makeDefinition({
        assignment: { mode: 'person', participantIds: ['alice'] },
        schedule: {
          frequency: 'monthly',
          startDate: '2026-08-01',
          time: '18:00',
          timeZone: 'UTC',
          nthWeekday: { weekday: 2, ordinal: 2 },
        },
      }),
      participantsById: { alice },
      rangeStart: '2026-08-01T00:00:00.000Z',
      rangeEnd: '2026-09-01T00:00:00.000Z',
    });
    expect(monthly.map((occurrence) => occurrence.scheduledAt)).toEqual([
      '2026-08-11T18:00:00.000Z',
    ]);

    const everyone = materializeChoreOccurrences({
      definition: makeDefinition({
        assignment: {
          mode: 'everyone',
          participantIds: ['alice', 'bob'],
          participantScheduleOverrides: { bob: { times: ['20:00'] } },
        },
        schedule: {
          frequency: 'once',
          date: '2026-08-10',
          time: '18:00',
          timeZone: 'UTC',
        },
      }),
      participantsById: { alice, bob },
      rangeStart: '2026-08-10T00:00:00.000Z',
      rangeEnd: '2026-08-11T00:00:00.000Z',
    });
    expect(everyone.map((occurrence) => occurrence.scheduledAt)).toEqual([
      '2026-08-10T18:00:00.000Z',
      '2026-08-10T20:00:00.000Z',
    ]);
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

  it('persists bounded Lucide avatar names for participants', () => {
    expect(
      isChoreWorkspaceData({
        ...createEmptyChoreWorkspace(),
        participantsById: {
          alice: { ...alice, avatarIcon: 'UserRound' },
        },
      })
    ).toBe(true);
    expect(
      isChoreWorkspaceData({
        ...createEmptyChoreWorkspace(),
        participantsById: {
          alice: { ...alice, avatarIcon: 'x'.repeat(65) },
        },
      })
    ).toBe(false);
  });

  it('migrates schema version 1 without discarding household state', () => {
    const legacy = {
      schemaVersion: 1,
      participantsById: { alice },
      definitionsById: {},
      occurrencesById: {},
      activity: [],
    };

    expect(migrateChoreWorkspaceData(legacy)).toEqual({
      ...legacy,
      schemaVersion: 2,
      outbox: [],
      historyRetention: { maxAgeDays: 730, maxEvents: 50_000 },
      experience: {
        version: 1,
        gamificationMode: 'off',
        presentationByDefinitionId: {},
        missionsById: {},
        rewardGoalsById: {},
        earnedPointsByParticipant: {},
        householdBonusPoints: 0,
        awardedMissionIds: [],
      },
    });
    expect(() => migrateChoreWorkspaceData({ schemaVersion: 0 })).toThrow('Unsupported');
  });

  it('accepts a persisted experience update in workspace activity and outbox data', () => {
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice },
    };
    const experience = {
      ...createChoreExperienceState(),
      setupStartedAt: '2026-08-01T09:00:00.000Z',
    };
    const updated = applyChoreWorkspaceAction({
      commandId: 'start-setup',
      action: { type: 'experience_update', actorParticipantId: 'alice', experience },
      timestamp: '2026-08-01T09:00:00.000Z',
      workspace,
    });
    const persisted = {
      ...updated.data,
      activity: [...updated.data.activity, updated.activity],
      outbox: [...updated.data.outbox, createChoreOutboxItem(updated.activity)],
    };

    expect(isChoreWorkspaceData(persisted)).toBe(true);
    expect(migrateChoreWorkspaceData(persisted).experience?.setupStartedAt).toBe(
      '2026-08-01T09:00:00.000Z'
    );
  });

  it('removes stale available occurrences and undelivered reminders when a schedule changes', () => {
    const currentDefinition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['alice'] },
      schedule: {
        frequency: 'weekly',
        startDate: '2026-08-01',
        time: '09:00',
        timeZone: 'UTC',
        daysOfWeek: [3],
      },
    });
    const staleOccurrence = makeOccurrence({
      id: `${currentDefinition.id}:2026-09-02T09:00:00.000Z:alice`,
      scheduledAt: '2026-09-02T09:00:00.000Z',
      dueAt: '2026-09-02T12:00:00.000Z',
      assigneeIds: ['alice'],
      assignmentSlot: 'alice',
    });
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice },
      definitionsById: { [currentDefinition.id]: currentDefinition },
      occurrencesById: { [staleOccurrence.id]: staleOccurrence },
      outbox: [
        {
          id: 'outbox:stale-reminder',
          activityId: 'activity:stale-reminder',
          eventType: 'reminder_due' as const,
          status: 'pending' as const,
          attempts: 0,
          createdAt: '2026-09-02T09:00:00.000Z',
          nextAttemptAt: '2026-09-02T09:00:00.000Z',
          occurrenceId: staleOccurrence.id,
          participantId: 'alice',
          destination: 'home_assistant' as const,
        },
      ],
    };
    const updatedDefinition = {
      ...currentDefinition,
      schedule: {
        frequency: 'weekly' as const,
        startDate: '2026-08-27',
        time: '09:00',
        timeZone: 'UTC',
        daysOfWeek: [4],
        intervalWeeks: 2,
      },
      updatedAt: '2026-08-27T10:00:00.000Z',
    };

    const result = applyChoreWorkspaceAction({
      commandId: 'update-every-two-weeks',
      action: {
        type: 'definition_update',
        actorParticipantId: 'alice',
        definition: updatedDefinition,
      },
      timestamp: '2026-08-27T10:00:00.000Z',
      workspace,
    });

    expect(result.data.occurrencesById).toEqual({});
    expect(result.data.outbox).toEqual([]);
  });

  it('reconciles a persisted stale September 2 occurrence against the current schedule', () => {
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['alice'] },
      schedule: {
        frequency: 'weekly',
        startDate: '2026-08-27',
        time: '09:00',
        timeZone: 'UTC',
        daysOfWeek: [4],
        intervalWeeks: 2,
      },
    });
    const staleOccurrence = makeOccurrence({
      id: `${definition.id}:2026-09-02T09:00:00.000Z:alice`,
      scheduledAt: '2026-09-02T09:00:00.000Z',
      dueAt: '2026-09-02T12:00:00.000Z',
      assigneeIds: ['alice'],
      assignmentSlot: 'alice',
    });
    const result = applyChoreWorkspaceAction({
      commandId: 'reconcile-every-two-weeks',
      action: {
        type: 'materialize_occurrences',
        rangeStart: '2026-08-27T00:00:00.000Z',
        rangeEnd: '2026-09-30T00:00:00.000Z',
      },
      timestamp: '2026-09-02T08:00:00.000Z',
      workspace: {
        ...createEmptyChoreWorkspace(),
        participantsById: { alice },
        definitionsById: { [definition.id]: definition },
        occurrencesById: { [staleOccurrence.id]: staleOccurrence },
      },
    });

    expect(result.data.occurrencesById[staleOccurrence.id]).toBeUndefined();
    expect(
      Object.values(result.data.occurrencesById).map((occurrence) => occurrence.scheduledAt)
    ).toEqual(['2026-08-27T09:00:00.000Z', '2026-09-10T09:00:00.000Z', '2026-09-24T09:00:00.000Z']);
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
    const occurrence = makeOccurrence({
      id: 'take-out-recycling:2026-08-10T16:00:00.000Z:bob',
      assigneeIds: ['bob'],
      assignmentSlot: 'bob',
    });

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

  it('allows an assigned participant to record a missed chore as completed late', () => {
    const completed = applyChoreOccurrenceCommand({
      commandId: 'command-complete-missed',
      command: { type: 'complete', participantId: 'bob' },
      definition: makeDefinition({
        assignment: { mode: 'person', participantIds: ['bob'] },
        approval: { required: true, approverIds: ['alice'] },
        claimPolicy: { required: true, allowSteal: false },
      }),
      occurrence: makeOccurrence({
        assigneeIds: ['bob'],
        assignmentSlot: 'bob',
        status: 'missed',
        missedAt: '2026-08-10T20:00:00.000Z',
      }),
      timestamp: '2026-08-11T08:00:00.000Z',
    });

    expect(completed.occurrence).toMatchObject({
      status: 'awaiting_approval',
      completedBy: 'bob',
      completedAt: '2026-08-11T08:00:00.000Z',
    });
    expect(completed.occurrence.missedAt).toBeUndefined();
    expect(completed.activity.type).toBe('completed');
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

  it('enforces required claims and permits configured claim expiry takeover', () => {
    const definition = makeDefinition({
      assignment: { mode: 'anyone', participantIds: ['alice', 'bob'] },
      claimPolicy: { required: true, allowSteal: true, expiresAfterMinutes: 30 },
    });
    const occurrence = makeOccurrence({
      assigneeIds: ['alice', 'bob'],
      assignmentSlot: 'shared',
    });

    expect(() =>
      applyChoreOccurrenceCommand({
        commandId: 'complete-unclaimed',
        command: { type: 'complete', participantId: 'alice' },
        definition,
        occurrence,
        timestamp: '2026-08-10T18:00:00.000Z',
      })
    ).toThrow('claimed');

    const claimed = applyChoreOccurrenceCommand({
      commandId: 'claim-alice',
      command: { type: 'claim', participantId: 'alice' },
      definition,
      occurrence,
      timestamp: '2026-08-10T18:00:00.000Z',
    });
    const takenOver = applyChoreOccurrenceCommand({
      commandId: 'claim-bob',
      command: { type: 'claim', participantId: 'bob' },
      definition,
      occurrence: claimed.occurrence,
      timestamp: '2026-08-10T18:31:00.000Z',
    });
    expect(takenOver.occurrence).toMatchObject({ claimedBy: 'bob', status: 'claimed' });
  });

  it('marks missed work and carries it forward exactly once', () => {
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['alice'] },
      missedPolicy: { graceMinutes: 30, action: 'carry_forward', carryForwardDays: 2 },
    });
    const occurrence = makeOccurrence();
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice },
      definitionsById: { [definition.id]: definition },
      occurrencesById: { [occurrence.id]: occurrence },
    };
    const result = runChoreWorkspaceScheduler(workspace, '2026-08-10T20:00:00.000Z');
    const original = result.data.occurrencesById[occurrence.id];
    const carried = Object.values(result.data.occurrencesById).find(
      (candidate) => candidate.carriedForwardFrom === occurrence.id
    );

    expect(original).toMatchObject({ status: 'missed', missedAt: '2026-08-10T20:00:00.000Z' });
    expect(carried).toMatchObject({
      scheduledAt: '2026-08-12T16:00:00.000Z',
      dueAt: '2026-08-12T19:00:00.000Z',
      status: 'available',
    });
    expect(result.activities.map((activity) => activity.type)).toEqual([
      'due',
      'overdue',
      'missed',
      'occurrence_created',
    ]);
    expect(
      runChoreWorkspaceScheduler(result.data, '2026-08-10T20:05:00.000Z', {
        existingEventIds: new Set(result.activities.map((activity) => activity.id)),
      }).activities
    ).toEqual([]);
  });

  it('schedules deduplicated reminders, defers quiet hours, and supports acknowledgement', () => {
    const remindedAlice: ChoreParticipant = {
      ...alice,
      reminderPreferences: {
        enabled: true,
        quietHours: { start: '21:00', end: '07:00', timeZone: 'Europe/Stockholm' },
        destination: { type: 'home_assistant', target: 'mobile_app_alice' },
      },
    };
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['alice'] },
      reminderPolicy: {
        enabled: true,
        beforeDueMinutes: [60],
        atDue: true,
        overdueEveryMinutes: 30,
        maxOverdueReminders: 2,
      },
    });
    const occurrence = makeOccurrence({ dueAt: '2026-08-10T21:00:00.000Z' });
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice: remindedAlice },
      definitionsById: { [definition.id]: definition },
      occurrencesById: { [occurrence.id]: occurrence },
    };

    const beforeDue = runChoreWorkspaceScheduler(workspace, '2026-08-10T20:15:00.000Z');
    expect(beforeDue.outboxItems).toEqual([
      expect.objectContaining({
        eventType: 'reminder_before_due',
        participantId: 'alice',
        destination: 'home_assistant',
        destinationTarget: 'mobile_app_alice',
        nextAttemptAt: '2026-08-11T05:00:00.000Z',
      }),
    ]);

    const persisted = {
      ...beforeDue.data,
      outbox: [...beforeDue.data.outbox, ...beforeDue.outboxItems],
    };
    expect(runChoreWorkspaceScheduler(persisted, '2026-08-10T20:20:00.000Z').outboxItems).toEqual(
      []
    );

    const acknowledged = applyChoreWorkspaceAction({
      commandId: 'ack-reminder',
      action: {
        type: 'reminder_acknowledge',
        outboxId: persisted.outbox[0].id,
        actorParticipantId: 'alice',
      },
      timestamp: '2026-08-10T20:30:00.000Z',
      workspace: persisted,
    });
    expect(acknowledged.data.outbox[0]).toMatchObject({
      status: 'delivered',
      deliveredAt: '2026-08-10T20:30:00.000Z',
    });
    expect(acknowledged.activity).toMatchObject({
      type: 'reminder_acknowledged',
      outboxId: persisted.outbox[0].id,
    });
  });

  it('records retryable outbox delivery outcomes without creating another delivery item', () => {
    const workspace = {
      ...createEmptyChoreWorkspace(),
      outbox: [
        {
          id: 'outbox:reminder:due:occurrence:alice',
          activityId: 'scheduler:due:occurrence',
          eventType: 'reminder_due' as const,
          status: 'pending' as const,
          attempts: 0,
          createdAt: '2026-08-10T18:00:00.000Z',
          nextAttemptAt: '2026-08-10T18:00:00.000Z',
          occurrenceId: 'occurrence',
          participantId: 'alice',
          destination: 'home_assistant' as const,
        },
      ],
    };
    const failed = applyChoreWorkspaceAction({
      commandId: 'delivery-failed',
      action: {
        type: 'outbox_delivery_update',
        outboxId: workspace.outbox[0].id,
        status: 'failed',
        error: 'Home Assistant is offline',
      },
      timestamp: '2026-08-10T18:01:00.000Z',
      workspace,
    });
    expect(failed.data.outbox).toHaveLength(1);
    expect(failed.data.outbox[0]).toMatchObject({
      status: 'failed',
      attempts: 1,
      lastError: 'Home Assistant is offline',
      nextAttemptAt: '2026-08-10T18:02:00.000Z',
    });
    expect(failed.activity).toMatchObject({
      type: 'outbox_delivery_updated',
      outboxId: workspace.outbox[0].id,
    });
  });

  it('applies actions through the workspace control boundary', () => {
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['bob'] },
      approval: { required: true, approverIds: ['alice'] },
    });
    const occurrence = makeOccurrence({ assigneeIds: ['bob'], assignmentSlot: 'bob' });
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice, bob },
      definitionsById: { [definition.id]: definition },
      occurrencesById: { [occurrence.id]: occurrence },
    };

    const completed = applyChoreWorkspaceOccurrenceCommand({
      commandId: 'command-workspace-complete',
      command: { type: 'complete', participantId: 'bob' },
      occurrenceId: occurrence.id,
      timestamp: '2026-08-10T18:10:00.000Z',
      workspace,
    });

    expect(completed.occurrence.status).toBe('awaiting_approval');
    expect(completed.data.occurrencesById[occurrence.id]).toBe(completed.occurrence);
    expect(completed.data.activity).toEqual([]);

    const approved = applyChoreWorkspaceOccurrenceCommand({
      commandId: 'command-workspace-approve',
      command: { type: 'approve', participantId: 'alice' },
      occurrenceId: occurrence.id,
      timestamp: '2026-08-10T18:15:00.000Z',
      workspace: completed.data,
    });

    expect(approved.occurrence.status).toBe('done');
    expect(approved.activity).toMatchObject({
      actorParticipantId: 'alice',
      type: 'approved',
    });
  });

  it('rejects paused or under-privileged actors at the workspace boundary', () => {
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['bob'] },
      approval: { required: true, approverIds: ['bob'] },
    });
    const occurrence = makeOccurrence({
      assigneeIds: ['bob'],
      assignmentSlot: 'bob',
      status: 'awaiting_approval',
      completedBy: 'bob',
      completedAt: '2026-08-10T18:10:00.000Z',
    });
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { bob },
      definitionsById: { [definition.id]: definition },
      occurrencesById: { [occurrence.id]: occurrence },
    };

    expect(() =>
      applyChoreWorkspaceOccurrenceCommand({
        commandId: 'command-unprivileged-approve',
        command: { type: 'approve', participantId: 'bob' },
        occurrenceId: occurrence.id,
        timestamp: '2026-08-10T18:15:00.000Z',
        workspace,
      })
    ).toThrow('cannot approve');

    expect(() =>
      applyChoreWorkspaceOccurrenceCommand({
        commandId: 'command-paused-complete',
        command: { type: 'complete', participantId: 'bob' },
        occurrenceId: occurrence.id,
        timestamp: '2026-08-10T18:15:00.000Z',
        workspace: {
          ...workspace,
          participantsById: {
            bob: { ...bob, pausedAt: '2026-08-10T18:14:00.000Z' },
          },
        },
      })
    ).toThrow('not active');
  });

  it('requires a manager reason for skip, reopen, and reassignment actions', () => {
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['bob'] },
    });
    const occurrence = makeOccurrence({ assigneeIds: ['bob'], assignmentSlot: 'bob' });
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice, bob },
      definitionsById: { [definition.id]: definition },
      occurrencesById: { [occurrence.id]: occurrence },
    };

    expect(() =>
      applyChoreWorkspaceOccurrenceCommand({
        commandId: 'command-bob-skip',
        command: { type: 'skip', participantId: 'bob', reason: 'Away' },
        occurrenceId: occurrence.id,
        timestamp: '2026-08-10T18:15:00.000Z',
        workspace,
      })
    ).toThrow('cannot skip');

    expect(() =>
      applyChoreWorkspaceOccurrenceCommand({
        commandId: 'command-empty-reason',
        command: { type: 'skip', participantId: 'alice', reason: ' ' },
        occurrenceId: occurrence.id,
        timestamp: '2026-08-10T18:15:00.000Z',
        workspace,
      })
    ).toThrow('requires a reason');

    const reassigned = applyChoreWorkspaceOccurrenceCommand({
      commandId: 'command-reassign',
      command: {
        type: 'reassign',
        participantId: 'alice',
        assigneeIds: ['alice'],
        reason: 'Bob is away',
      },
      occurrenceId: occurrence.id,
      timestamp: '2026-08-10T18:15:00.000Z',
      workspace,
    });

    expect(reassigned.occurrence).toMatchObject({
      assigneeIds: ['alice'],
      assignmentSlot: 'manager:alice',
      status: 'available',
    });
    expect(reassigned.activity).toMatchObject({
      type: 'reassigned',
      reason: 'Bob is away',
      previousAssigneeIds: ['bob'],
      assigneeIds: ['alice'],
    });
  });

  it('allows a manager to override an approval only with an audited reason', () => {
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['bob'] },
      approval: { required: true, approverIds: ['bob'] },
    });
    const occurrence = makeOccurrence({
      assigneeIds: ['bob'],
      assignmentSlot: 'bob',
      status: 'awaiting_approval',
      completedBy: 'bob',
      completedAt: '2026-08-10T18:10:00.000Z',
    });
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice, bob },
      definitionsById: { [definition.id]: definition },
      occurrencesById: { [occurrence.id]: occurrence },
    };

    expect(() =>
      applyChoreWorkspaceOccurrenceCommand({
        commandId: 'manager-approve-without-reason',
        command: {
          type: 'approve',
          participantId: 'alice',
          managerOverride: true,
        },
        occurrenceId: occurrence.id,
        timestamp: '2026-08-10T18:15:00.000Z',
        workspace,
      })
    ).toThrow('requires a reason');

    const approved = applyChoreWorkspaceOccurrenceCommand({
      commandId: 'manager-approve',
      command: {
        type: 'approve',
        participantId: 'alice',
        managerOverride: true,
        reason: 'Verified in person',
      },
      occurrenceId: occurrence.id,
      timestamp: '2026-08-10T18:15:00.000Z',
      workspace,
    });
    expect(approved.occurrence.status).toBe('done');
    expect(approved.activity.reason).toBe('Verified in person');
  });

  it('rejects malformed optional occurrence fields in persisted data', () => {
    const occurrence = makeOccurrence();
    expect(
      isChoreWorkspaceData({
        ...createEmptyChoreWorkspace(),
        occurrencesById: {
          [occurrence.id]: { ...occurrence, completedAt: 'not-a-date' },
        },
      })
    ).toBe(false);
  });

  it('applies profile, definition, materialization, and archive actions through manager policy', () => {
    const createdManager = applyChoreWorkspaceAction({
      commandId: 'create-alice',
      action: { type: 'participant_create', participant: alice },
      timestamp: '2026-08-01T08:00:00.000Z',
      workspace: createEmptyChoreWorkspace(),
    });
    const createdBob = applyChoreWorkspaceAction({
      commandId: 'create-bob',
      action: {
        type: 'participant_create',
        participant: bob,
        actorParticipantId: 'alice',
      },
      timestamp: '2026-08-01T08:01:00.000Z',
      workspace: createdManager.data,
    });
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['bob'] },
    });
    const createdDefinition = applyChoreWorkspaceAction({
      commandId: 'create-definition',
      action: { type: 'definition_create', definition, actorParticipantId: 'alice' },
      timestamp: '2026-08-01T08:02:00.000Z',
      workspace: createdBob.data,
    });
    const occurrence = makeOccurrence({
      id: 'take-out-recycling:2026-08-10T16:00:00.000Z:bob',
      assigneeIds: ['bob'],
      assignmentSlot: 'bob',
    });
    const materialized = applyChoreWorkspaceAction({
      commandId: 'materialize',
      action: {
        type: 'materialize_occurrences',
        rangeStart: '2026-08-10T00:00:00.000Z',
        rangeEnd: '2026-08-11T00:00:00.000Z',
      },
      timestamp: '2026-08-01T08:03:00.000Z',
      workspace: createdDefinition.data,
    });
    const archived = applyChoreWorkspaceAction({
      commandId: 'archive-definition',
      action: {
        type: 'definition_archive',
        definitionId: definition.id,
        actorParticipantId: 'alice',
      },
      timestamp: '2026-08-01T08:04:00.000Z',
      workspace: materialized.data,
    });

    expect(createdBob.data.participantsById.bob).toEqual(bob);
    expect(createdDefinition.data.definitionsById[definition.id]).toEqual(definition);
    expect(materialized.data.occurrencesById[occurrence.id]).toEqual(occurrence);
    expect(archived.data.definitionsById[definition.id]).toMatchObject({
      enabled: false,
      archivedAt: '2026-08-01T08:04:00.000Z',
    });
    expect(archived.data.occurrencesById[occurrence.id]).toBeUndefined();
  });

  it('requires a manager for household configuration actions', () => {
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice, bob },
    };
    expect(() =>
      applyChoreWorkspaceAction({
        commandId: 'create-definition',
        action: {
          type: 'definition_create',
          definition: makeDefinition(),
          actorParticipantId: 'bob',
        },
        timestamp: '2026-08-01T08:00:00.000Z',
        workspace,
      })
    ).toThrow('Only a household manager');

    const updated = applyChoreWorkspaceAction({
      commandId: 'retention',
      action: {
        type: 'retention_update',
        actorParticipantId: 'alice',
        policy: { maxAgeDays: 365, maxEvents: 10_000 },
      },
      timestamp: '2026-08-01T08:00:00.000Z',
      workspace,
    });
    expect(updated.data.historyRetention).toEqual({ maxAgeDays: 365, maxEvents: 10_000 });
    expect(updated.activity.type).toBe('retention_updated');
  });

  it('deletes a chore and its live dependent data while retaining immutable activity', () => {
    const definition = makeDefinition();
    const occurrence = makeOccurrence();
    const priorActivity = {
      id: 'activity:completed',
      commandId: 'completed',
      occurrenceId: occurrence.id,
      definitionId: definition.id,
      type: 'completed' as const,
      timestamp: '2026-08-10T19:00:00.000Z',
    };
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice, bob },
      definitionsById: { [definition.id]: definition },
      occurrencesById: { [occurrence.id]: occurrence },
      activity: [priorActivity],
      outbox: [createChoreOutboxItem(priorActivity)],
      experience: {
        ...createChoreExperienceState(),
        presentationByDefinitionId: { [definition.id]: { points: 10 } },
        missionsById: {
          reset: {
            id: 'reset',
            title: 'Weekend reset',
            definitionIds: [definition.id],
            status: 'active' as const,
            createdAt: '2026-08-01T08:00:00.000Z',
            updatedAt: '2026-08-01T08:00:00.000Z',
          },
        },
        awardedMissionIds: ['reset'],
      },
    };

    const deleted = applyChoreWorkspaceAction({
      commandId: 'delete-definition',
      action: {
        type: 'definition_delete',
        definitionId: definition.id,
        actorParticipantId: 'alice',
      },
      timestamp: '2026-08-11T08:00:00.000Z',
      workspace,
    });

    expect(deleted.activity).toMatchObject({
      type: 'definition_deleted',
      definitionId: definition.id,
    });
    expect(deleted.data.definitionsById).toEqual({});
    expect(deleted.data.occurrencesById).toEqual({});
    expect(deleted.data.outbox).toEqual([]);
    const deletedExperience = deleted.data.experience;
    expect(deletedExperience).toBeDefined();
    if (!deletedExperience) throw new Error('Expected deletion to retain chore experience state');
    expect(deletedExperience.presentationByDefinitionId).toEqual({});
    expect(deletedExperience.missionsById).toEqual({});
    expect(deletedExperience.awardedMissionIds).toEqual([]);
    expect(deleted.data.activity).toEqual([priorActivity]);
  });

  it('updates versioned experience data through manager policy and validates references', () => {
    const definition = makeDefinition();
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice, bob },
      definitionsById: { [definition.id]: definition },
    };
    const experience = {
      version: 1 as const,
      gamificationMode: 'family' as const,
      presentationByDefinitionId: {
        [definition.id]: { estimatedMinutes: 5, points: 10 },
      },
      missionsById: {
        reset: {
          id: 'reset',
          title: 'Weekend reset',
          definitionIds: [definition.id],
          status: 'active' as const,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
        },
      },
      rewardGoalsById: {
        outing: {
          id: 'outing',
          title: 'Family outing',
          type: 'family' as const,
          targetPoints: 200,
          participantId: 'bob',
          enabled: true,
          createdAt: '2026-08-01T08:00:00.000Z',
          updatedAt: '2026-08-01T08:00:00.000Z',
        },
      },
    };

    const updated = applyChoreWorkspaceAction({
      commandId: 'update-experience',
      action: { type: 'experience_update', actorParticipantId: 'alice', experience },
      timestamp: '2026-08-01T09:00:00.000Z',
      workspace,
    });

    expect(updated.data.experience).toEqual(experience);
    expect(updated.activity.type).toBe('experience_updated');
    expect(() =>
      applyChoreWorkspaceAction({
        commandId: 'invalid-experience',
        action: {
          type: 'experience_update',
          actorParticipantId: 'alice',
          experience: {
            ...experience,
            presentationByDefinitionId: { missing: { points: 5 } },
          },
        },
        timestamp: '2026-08-01T09:01:00.000Z',
        workspace,
      })
    ).toThrow('unavailable chore');
  });

  it('persists earned points across occurrence retention and reverses reopened work', () => {
    const definition = makeDefinition({
      assignment: { mode: 'person', participantIds: ['bob'] },
    });
    const occurrence = makeOccurrence({ assigneeIds: ['bob'], assignmentSlot: 'bob' });
    const experience = createEmptyChoreWorkspace().experience;
    if (!experience) throw new Error('Expected chore experience');
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice, bob },
      definitionsById: { [definition.id]: definition },
      occurrencesById: { [occurrence.id]: occurrence },
      experience: {
        ...experience,
        gamificationMode: 'family' as const,
        presentationByDefinitionId: { [definition.id]: { points: 15 } },
        missionsById: {
          reset: {
            id: 'reset',
            title: 'One-chore reset',
            definitionIds: [definition.id],
            status: 'active' as const,
            rewardPoints: 50,
            createdAt: '2026-08-01T08:00:00.000Z',
            updatedAt: '2026-08-01T08:00:00.000Z',
          },
        },
      },
    };

    const completed = applyChoreWorkspaceAction({
      commandId: 'complete-for-points',
      action: {
        type: 'occurrence_action',
        occurrenceId: occurrence.id,
        action: { type: 'complete', participantId: 'bob' },
      },
      timestamp: '2026-08-10T17:00:00.000Z',
      workspace,
    });
    expect(completed.data.experience?.earnedPointsByParticipant).toEqual({ bob: 15 });
    expect(completed.activity).toMatchObject({ participantId: 'bob', pointsDelta: 15 });
    expect(completed.data.experience).toMatchObject({
      householdBonusPoints: 50,
      awardedMissionIds: ['reset'],
    });

    const reopened = applyChoreWorkspaceAction({
      commandId: 'reopen-points',
      action: {
        type: 'occurrence_action',
        occurrenceId: occurrence.id,
        action: { type: 'reopen', participantId: 'alice', reason: 'Needs another pass' },
      },
      timestamp: '2026-08-10T17:05:00.000Z',
      workspace: completed.data,
    });
    expect(reopened.data.experience?.earnedPointsByParticipant).toEqual({ bob: 0 });
    expect(reopened.activity).toMatchObject({ participantId: 'bob', pointsDelta: -15 });
    expect(reopened.data.experience?.householdBonusPoints).toBe(50);
  });

  it('lets managers add or remove participant points with an auditable reason', () => {
    const workspace = {
      ...createEmptyChoreWorkspace(),
      participantsById: { alice, bob },
      experience: {
        ...createChoreExperienceState(),
        gamificationMode: 'light' as const,
        earnedPointsByParticipant: { bob: 5 },
      },
    };
    const adjusted = applyChoreWorkspaceAction({
      commandId: 'adjust-bob-points',
      action: {
        type: 'experience_points_adjust',
        actorParticipantId: 'alice',
        participantId: 'bob',
        pointsDelta: -15,
        reason: 'Replaced broken item',
      },
      timestamp: '2026-08-10T18:00:00.000Z',
      workspace,
    });
    expect(adjusted.data.experience?.earnedPointsByParticipant).toEqual({ bob: -10 });
    expect(adjusted.activity).toMatchObject({
      type: 'points_adjusted',
      participantId: 'bob',
      actorParticipantId: 'alice',
      pointsDelta: -15,
      reason: 'Replaced broken item',
    });
  });

  it.each([0, 1.5, 10_001, -10_001])('rejects invalid point adjustment %s', (pointsDelta) => {
    expect(() =>
      applyChoreWorkspaceAction({
        commandId: `invalid-adjustment-${pointsDelta}`,
        action: {
          type: 'experience_points_adjust',
          actorParticipantId: 'alice',
          participantId: 'bob',
          pointsDelta,
          reason: 'Invalid',
        },
        timestamp: '2026-08-10T18:00:00.000Z',
        workspace: { ...createEmptyChoreWorkspace(), participantsById: { alice, bob } },
      })
    ).toThrow('non-zero whole number');
  });

  it('rejects point adjustments without a manager or participant', () => {
    const workspace = { ...createEmptyChoreWorkspace(), participantsById: { alice, bob } };
    const action = {
      type: 'experience_points_adjust' as const,
      actorParticipantId: 'alice',
      participantId: 'bob',
      pointsDelta: 5,
      reason: 'Bonus',
    };
    expect(() =>
      applyChoreWorkspaceAction({
        commandId: 'non-manager-adjustment',
        action: { ...action, actorParticipantId: 'bob' },
        timestamp: '2026-08-10T18:00:00.000Z',
        workspace,
      })
    ).toThrow('manager');
    expect(() =>
      applyChoreWorkspaceAction({
        commandId: 'missing-person-adjustment',
        action: { ...action, participantId: 'missing' },
        timestamp: '2026-08-10T18:00:00.000Z',
        workspace,
      })
    ).toThrow('no longer available');
  });

  it('allows point adjustments without a reason', () => {
    const adjusted = applyChoreWorkspaceAction({
      commandId: 'adjustment-without-reason',
      action: {
        type: 'experience_points_adjust',
        actorParticipantId: 'alice',
        participantId: 'bob',
        pointsDelta: 5,
      },
      timestamp: '2026-08-10T18:00:00.000Z',
      workspace: { ...createEmptyChoreWorkspace(), participantsById: { alice, bob } },
    });
    expect(adjusted.data.experience?.earnedPointsByParticipant).toEqual({ bob: 5 });
    expect(adjusted.activity).toMatchObject({
      type: 'points_adjusted',
      participantId: 'bob',
      pointsDelta: 5,
    });
    expect(adjusted.activity.reason).toBeUndefined();
  });
});
