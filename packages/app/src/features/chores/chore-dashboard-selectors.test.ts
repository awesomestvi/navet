import { createChoreExperienceState } from '@navet/core/chore-experience';
import type { ChoreDefinition, ChoreOccurrence, ChoreWorkspaceData } from '@navet/core/chores';
import { describe, expect, it } from 'vitest';
import {
  getHousePulse,
  getMissionProgressList,
  getRewardProgressList,
  getRoomChoreSummaries,
  getRoomTodayChores,
  getTodayChoresForParticipant,
} from './chore-dashboard-selectors';

const now = new Date('2026-08-15T10:00:00.000Z');
const createdAt = '2026-08-01T08:00:00.000Z';

function definition(id: string, room: string, participantId = 'maya'): ChoreDefinition {
  return {
    id,
    title: id,
    roomRef: { canonicalId: `room:${room}`, label: room },
    enabled: true,
    assignment: { mode: 'person', participantIds: [participantId] },
    schedule: {
      frequency: 'once',
      date: '2026-08-15',
      time: '09:00',
      timeZone: 'UTC',
    },
    dueWindowMinutes: 60,
    approval: { required: false, approverIds: [] },
    createdAt,
    updatedAt: createdAt,
  };
}

function occurrence(
  id: string,
  definitionId: string,
  status: ChoreOccurrence['status'],
  completedBy?: string
): ChoreOccurrence {
  return {
    id,
    definitionId,
    scheduledAt: '2026-08-15T09:00:00.000Z',
    dueAt: '2026-08-15T10:00:00.000Z',
    assigneeIds: ['maya'],
    assignmentSlot: 'maya',
    status,
    completedBy,
    completedAt: completedBy ? '2026-08-15T09:30:00.000Z' : undefined,
    updatedAt: '2026-08-15T09:30:00.000Z',
  };
}

function workspace(): ChoreWorkspaceData {
  const experience = createChoreExperienceState();
  experience.gamificationMode = 'family';
  experience.presentationByDefinitionId = {
    dishes: { points: 15, estimatedMinutes: 4 },
    toys: { points: 10, estimatedMinutes: 5 },
    shoes: { points: 5, estimatedMinutes: 2 },
  };
  experience.missionsById.reset = {
    id: 'reset',
    title: 'Saturday reset',
    definitionIds: ['dishes', 'toys'],
    status: 'active',
    rewardPoints: 100,
    createdAt,
    updatedAt: createdAt,
  };
  experience.rewardGoalsById.lego = {
    id: 'lego',
    title: 'LEGO set',
    type: 'saving',
    participantId: 'maya',
    targetPoints: 800,
    startingPoints: 275,
    enabled: true,
    createdAt,
    updatedAt: createdAt,
  };
  return {
    schemaVersion: 2,
    participantsById: {
      maya: {
        id: 'maya',
        displayName: 'Maya',
        capabilities: ['complete'],
        createdAt,
        updatedAt: createdAt,
      },
    },
    definitionsById: {
      dishes: definition('dishes', 'Kitchen'),
      toys: definition('toys', "Maya's room"),
      shoes: definition('shoes', 'Hallway'),
    },
    occurrencesById: {
      dishes: occurrence('dishes', 'dishes', 'done', 'maya'),
      toys: occurrence('toys', 'toys', 'available'),
      shoes: occurrence('shoes', 'shoes', 'available'),
    },
    activity: [],
    outbox: [],
    experience,
  };
}

describe('chore dashboard selectors', () => {
  it('builds a real household pulse from current task state', () => {
    expect(getHousePulse(workspace(), now)).toMatchObject({
      completed: 1,
      total: 3,
      remaining: 2,
      overdue: 0,
      percent: 33,
      pointsEarned: 15,
      strongDays: 0,
      streakDays: 1,
    });
  });

  it('counts overdue unfinished chores in the household pulse', () => {
    expect(getHousePulse(workspace(), new Date('2026-08-15T10:01:00.000Z'))).toMatchObject({
      remaining: 2,
      overdue: 2,
    });
  });

  it('keeps participant focus and room summaries derived from the same occurrences', () => {
    const data = workspace();
    expect(getTodayChoresForParticipant(data, 'maya', now)).toHaveLength(3);
    expect(getRoomChoreSummaries(data, now)).toEqual([
      { canonicalId: 'room:Hallway', label: 'Hallway', total: 1, remaining: 1, completed: 0 },
      {
        canonicalId: "room:Maya's room",
        label: "Maya's room",
        total: 1,
        remaining: 1,
        completed: 0,
      },
      { canonicalId: 'room:Kitchen', label: 'Kitchen', total: 1, remaining: 0, completed: 1 },
    ]);
  });

  it('matches room chores by canonical room id when the dashboard room has a custom name', () => {
    expect(
      getRoomTodayChores(
        workspace(),
        { label: 'Cooking', canonicalIds: ['room:Kitchen'] },
        now
      ).map((item) => item.id)
    ).toEqual(['dishes']);
  });

  it('derives cooperative mission and saving-goal progress without a leaderboard', () => {
    const data = workspace();
    expect(getMissionProgressList(data, now)[0]).toMatchObject({
      completed: 1,
      total: 2,
      percent: 50,
    });
    expect(getRewardProgressList(data)[0]).toMatchObject({ points: 290, percent: 36 });

    const toys = data.occurrencesById.toys;
    if (!toys) throw new Error('Expected toys occurrence');
    data.occurrencesById.toys = {
      ...toys,
      status: 'done',
      completedBy: 'maya',
      completedAt: '2026-08-15T10:10:00.000Z',
    };
    expect(getMissionProgressList(data, now)[0]).toMatchObject({
      completed: 2,
      total: 2,
      percent: 100,
    });
    expect(getRewardProgressList(data)[0]).toMatchObject({ points: 300, percent: 38 });

    if (!data.experience) throw new Error('Expected chore experience');
    data.experience.earnedPointsByParticipant = { maya: 300 };
    data.occurrencesById = {};
    expect(getRewardProgressList(data)[0]).toMatchObject({ points: 575, percent: 72 });

    const lego = data.experience.rewardGoalsById.lego;
    if (!lego) throw new Error('Expected LEGO reward goal');
    data.experience.rewardGoalsById.lego = {
      ...lego,
      type: 'family',
      participantId: undefined,
      targetPoints: 100,
      startingPoints: undefined,
    };
    data.experience.earnedPointsByParticipant = { maya: 25 };
    data.experience.householdBonusPoints = 50;
    expect(getRewardProgressList(data)[0]).toMatchObject({ points: 75, percent: 75 });
  });

  it('keeps chores without a room in Today without inventing a room summary', () => {
    const data = workspace();
    const shoes = data.definitionsById.shoes;
    if (!shoes) throw new Error('Expected shoes chore');
    data.definitionsById.shoes = { ...shoes, roomRef: undefined };

    expect(getTodayChoresForParticipant(data, 'maya', now)).toHaveLength(3);
    expect(
      getRoomChoreSummaries(data, now).some((room) => room.canonicalId === 'room:Hallway')
    ).toBe(false);
  });
});
