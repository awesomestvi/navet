import { describe, expect, it } from 'vitest';
import {
  createChoreExperienceState,
  isChoreExperienceState,
  normalizeChoreExperienceState,
} from './chore-experience';

describe('chore experience state', () => {
  it('defaults to a calm, non-gamified household experience', () => {
    expect(createChoreExperienceState()).toEqual({
      version: 1,
      gamificationMode: 'off',
      presentationByDefinitionId: {},
      missionsById: {},
      rewardGoalsById: {},
      earnedPointsByParticipant: {},
      householdBonusPoints: 0,
      awardedMissionIds: [],
    });
  });

  it('accepts missions, reward goals, and optional child presentation metadata', () => {
    const state = createChoreExperienceState();
    state.setupStartedAt = '2026-08-15T07:45:00.000Z';
    state.setupCompletedAt = '2026-08-15T08:00:00.000Z';
    state.gamificationMode = 'family';
    state.earnedPointsByParticipant = { maya: 15 };
    state.householdBonusPoints = 25;
    state.awardedMissionIds = ['reset'];
    state.presentationByDefinitionId.dishes = {
      estimatedMinutes: 4,
      points: 15,
      childTitle: 'Dishwasher dash',
      icon: 'Utensils',
      color: '#2563eb',
    };
    state.missionsById.reset = {
      id: 'reset',
      title: 'Saturday reset',
      definitionIds: ['dishes'],
      status: 'active',
      rewardPoints: 100,
      createdAt: '2026-08-15T08:00:00.000Z',
      updatedAt: '2026-08-15T08:00:00.000Z',
    };
    state.rewardGoalsById.movie = {
      id: 'movie',
      title: 'Movie night',
      type: 'family',
      targetPoints: 1000,
      startingPoints: 480,
      enabled: true,
      createdAt: '2026-08-15T08:00:00.000Z',
      updatedAt: '2026-08-15T08:00:00.000Z',
    };

    expect(isChoreExperienceState(state)).toBe(true);
  });

  it('rejects malformed setup progress timestamps', () => {
    expect(
      isChoreExperienceState({
        ...createChoreExperienceState(),
        setupStartedAt: 'not-a-date',
      })
    ).toBe(false);
  });

  it('rejects malformed chore color overrides', () => {
    expect(
      isChoreExperienceState({
        ...createChoreExperienceState(),
        presentationByDefinitionId: {
          dishes: { color: 'blue' },
        },
      })
    ).toBe(false);
  });

  it('normalizes missing or invalid additive data without affecting chore documents', () => {
    expect(normalizeChoreExperienceState(undefined)).toEqual(createChoreExperienceState());
    expect(normalizeChoreExperienceState({ version: 99 })).toEqual(createChoreExperienceState());

    const previousVersionOneShape = {
      version: 1,
      gamificationMode: 'off',
      presentationByDefinitionId: {},
      missionsById: {},
      rewardGoalsById: {},
    };
    expect(normalizeChoreExperienceState(previousVersionOneShape)).toEqual(previousVersionOneShape);
  });
});
