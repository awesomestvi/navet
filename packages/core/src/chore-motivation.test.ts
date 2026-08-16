import { describe, expect, it } from 'vitest';
import {
  applyChoreMotivationActivity,
  configureChoreMotivation,
  createChoreMotivationState,
  requestChoreReward,
  reverseChoreMotivationCompletion,
  reviewChoreRewardClaim,
  upsertChoreReward,
} from './chore-motivation';

const completedActivity = {
  id: 'activity:complete',
  commandId: 'complete',
  occurrenceId: 'occurrence-1',
  definitionId: 'dishes',
  actorParticipantId: 'alex',
  type: 'approved' as const,
  timestamp: '2026-08-14T18:00:00.000Z',
};

describe('chore motivation', () => {
  it('is off by default and awards once only after a final completion', () => {
    const configured = configureChoreMotivation({
      state: createChoreMotivationState(),
      manager: true,
      mode: 'points',
      definitionId: 'dishes',
      points: 5,
    });
    const waiting = applyChoreMotivationActivity({
      state: configured,
      activity: completedActivity,
      participantId: 'alex',
      definitionId: 'dishes',
      final: false,
    });
    const awarded = applyChoreMotivationActivity({
      state: waiting,
      activity: completedActivity,
      participantId: 'alex',
      definitionId: 'dishes',
      final: true,
    });
    const duplicate = applyChoreMotivationActivity({
      state: awarded,
      activity: completedActivity,
      participantId: 'alex',
      definitionId: 'dishes',
      final: true,
    });
    expect(waiting.balancesByParticipant.alex).toBeUndefined();
    expect(duplicate.balancesByParticipant.alex).toBe(5);
    expect(duplicate.ledger).toHaveLength(1);
  });

  it('reverses a reopened completion so it cannot be farmed', () => {
    const configured = configureChoreMotivation({
      state: createChoreMotivationState(),
      manager: true,
      mode: 'points',
      definitionId: 'dishes',
      points: 5,
    });
    const awarded = applyChoreMotivationActivity({
      state: configured,
      activity: completedActivity,
      participantId: 'alex',
      definitionId: 'dishes',
      final: true,
    });
    const reversed = reverseChoreMotivationCompletion({
      state: awarded,
      participantId: 'alex',
      activity: {
        ...completedActivity,
        id: 'activity:reopen',
        commandId: 'reopen',
        type: 'reopened',
        timestamp: '2026-08-14T18:10:00.000Z',
      },
    });
    expect(reversed.balancesByParticipant.alex).toBe(0);
    expect(reversed.ledger.at(-1)).toMatchObject({
      points: -5,
      reversesEntryId: 'motivation:activity:complete',
    });
  });

  it('supports an approval, fulfilment, and refund reward workflow', () => {
    let state = configureChoreMotivation({
      state: createChoreMotivationState(),
      manager: true,
      mode: 'points',
      definitionId: 'dishes',
      points: 10,
    });
    state = applyChoreMotivationActivity({
      state,
      activity: completedActivity,
      participantId: 'alex',
      definitionId: 'dishes',
      final: true,
    });
    state = upsertChoreReward({
      state,
      manager: true,
      reward: { id: 'movie', title: 'Movie night', cost: 8, enabled: true },
    });
    state = requestChoreReward({
      state,
      claimId: 'claim-1',
      rewardId: 'movie',
      participantId: 'alex',
    });
    state = reviewChoreRewardClaim({
      state,
      manager: true,
      claimId: 'claim-1',
      managerParticipantId: 'manager',
      decision: 'approve',
      reason: 'Earned fairly',
    });
    expect(state.balancesByParticipant.alex).toBe(2);
    state = reviewChoreRewardClaim({
      state,
      manager: true,
      claimId: 'claim-1',
      managerParticipantId: 'manager',
      decision: 'fulfill',
      reason: 'Movie watched',
    });
    state = reviewChoreRewardClaim({
      state,
      manager: true,
      claimId: 'claim-1',
      managerParticipantId: 'manager',
      decision: 'refund',
      reason: 'Plans changed',
    });
    expect(state.balancesByParticipant.alex).toBe(10);
    expect(state.claimsById['claim-1']?.status).toBe('refunded');
  });
});
