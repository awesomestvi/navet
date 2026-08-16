import type { ChoreActivity } from './chores';

export const CHORE_MOTIVATION_VERSION = 1 as const;

export type ChoreMotivationMode = 'off' | 'points';

export interface ChoreReward {
  id: string;
  title: string;
  cost: number;
  enabled: boolean;
}

export type ChoreRewardClaimStatus =
  | 'requested'
  | 'approved'
  | 'rejected'
  | 'fulfilled'
  | 'refunded';

export interface ChoreRewardClaim {
  id: string;
  rewardId: string;
  participantId: string;
  status: ChoreRewardClaimStatus;
  requestedAt: string;
  updatedAt: string;
  managerParticipantId?: string;
  reason?: string;
}

export interface ChoreBadgeMilestone {
  id: string;
  title: string;
  metric: 'final_completions' | 'points_earned';
  threshold: number;
}

export interface ChoreBadgeAward {
  id: string;
  badgeId: string;
  participantId: string;
  awardedAt: string;
}

export interface ChoreChallenge {
  id: string;
  title: string;
  startsAt: string;
  endsAt: string;
  metric: 'final_completions' | 'points_earned';
  target: number;
  participantIds: string[];
  progressByParticipant: Record<string, number>;
  completedByParticipantIds: string[];
}

export interface ChoreMotivationLedgerEntry {
  id: string;
  participantId: string;
  points: number;
  reason: string;
  timestamp: string;
  actorParticipantId?: string;
  activityId?: string;
  occurrenceId?: string;
  reversesEntryId?: string;
}

export interface ChoreMotivationState {
  version: typeof CHORE_MOTIVATION_VERSION;
  mode: ChoreMotivationMode;
  definitionPoints: Record<string, number>;
  balancesByParticipant: Record<string, number>;
  finalCompletionsByParticipant: Record<string, number>;
  processedActivityIds: string[];
  rewardsById: Record<string, ChoreReward>;
  claimsById: Record<string, ChoreRewardClaim>;
  badgesById: Record<string, ChoreBadgeMilestone>;
  badgeAwards: ChoreBadgeAward[];
  challengesById: Record<string, ChoreChallenge>;
  ledger: ChoreMotivationLedgerEntry[];
}

function clone<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

function assertManager(manager: boolean) {
  if (!manager) throw new Error('Only a household manager can change motivation settings');
}

function assertPoints(points: number) {
  if (!Number.isSafeInteger(points) || points < 0 || points > 10_000) {
    throw new Error('Chore points must be a whole number between 0 and 10000');
  }
}

function assertReason(reason: string) {
  if (!reason.trim()) throw new Error('A reason is required');
}

export function createChoreMotivationState(): ChoreMotivationState {
  return {
    version: CHORE_MOTIVATION_VERSION,
    mode: 'off',
    definitionPoints: {},
    balancesByParticipant: {},
    finalCompletionsByParticipant: {},
    processedActivityIds: [],
    rewardsById: {},
    claimsById: {},
    badgesById: {},
    badgeAwards: [],
    challengesById: {},
    ledger: [],
  };
}

export function configureChoreMotivation(input: {
  state: ChoreMotivationState;
  manager: boolean;
  mode?: ChoreMotivationMode;
  definitionId?: string;
  points?: number;
}): ChoreMotivationState {
  assertManager(input.manager);
  const next = clone(input.state);
  if (input.mode) next.mode = input.mode;
  if (input.definitionId && input.points !== undefined) {
    assertPoints(input.points);
    next.definitionPoints[input.definitionId] = input.points;
  }
  return next;
}

function updateMilestones(state: ChoreMotivationState, participantId: string, timestamp: string) {
  for (const badge of Object.values(state.badgesById)) {
    const progress =
      badge.metric === 'final_completions'
        ? (state.finalCompletionsByParticipant[participantId] ?? 0)
        : state.ledger
            .filter((entry) => entry.participantId === participantId && entry.points > 0)
            .reduce((sum, entry) => sum + entry.points, 0);
    if (
      progress >= badge.threshold &&
      !state.badgeAwards.some(
        (award) => award.badgeId === badge.id && award.participantId === participantId
      )
    ) {
      state.badgeAwards.push({
        id: `badge-award:${badge.id}:${participantId}`,
        badgeId: badge.id,
        participantId,
        awardedAt: timestamp,
      });
    }
  }

  const timestampMs = Date.parse(timestamp);
  for (const challenge of Object.values(state.challengesById)) {
    if (
      timestampMs < Date.parse(challenge.startsAt) ||
      timestampMs > Date.parse(challenge.endsAt) ||
      (challenge.participantIds.length > 0 && !challenge.participantIds.includes(participantId))
    ) {
      continue;
    }
    const increment = challenge.metric === 'final_completions' ? 1 : 0;
    challenge.progressByParticipant[participantId] =
      (challenge.progressByParticipant[participantId] ?? 0) + increment;
    if (
      challenge.progressByParticipant[participantId] >= challenge.target &&
      !challenge.completedByParticipantIds.includes(participantId)
    ) {
      challenge.completedByParticipantIds.push(participantId);
    }
  }
}

export function applyChoreMotivationActivity(input: {
  state: ChoreMotivationState;
  activity: ChoreActivity;
  participantId: string;
  definitionId: string;
  final: boolean;
  imported?: boolean;
}): ChoreMotivationState {
  const next = clone(input.state);
  if (
    next.mode === 'off' ||
    input.imported ||
    !input.final ||
    (input.activity.type !== 'completed' && input.activity.type !== 'approved') ||
    next.processedActivityIds.includes(input.activity.id)
  ) {
    return next;
  }
  const points = next.definitionPoints[input.definitionId] ?? 0;
  next.processedActivityIds.push(input.activity.id);
  next.finalCompletionsByParticipant[input.participantId] =
    (next.finalCompletionsByParticipant[input.participantId] ?? 0) + 1;
  next.balancesByParticipant[input.participantId] =
    (next.balancesByParticipant[input.participantId] ?? 0) + points;
  next.ledger.push({
    id: `motivation:${input.activity.id}`,
    participantId: input.participantId,
    points,
    reason: 'Final chore completion',
    timestamp: input.activity.timestamp,
    activityId: input.activity.id,
    occurrenceId: input.activity.occurrenceId,
  });
  updateMilestones(next, input.participantId, input.activity.timestamp);
  for (const challenge of Object.values(next.challengesById)) {
    if (challenge.metric !== 'points_earned') continue;
    const timestampMs = Date.parse(input.activity.timestamp);
    if (
      timestampMs < Date.parse(challenge.startsAt) ||
      timestampMs > Date.parse(challenge.endsAt) ||
      (challenge.participantIds.length > 0 &&
        !challenge.participantIds.includes(input.participantId))
    ) {
      continue;
    }
    challenge.progressByParticipant[input.participantId] =
      (challenge.progressByParticipant[input.participantId] ?? 0) + points;
    if (
      challenge.progressByParticipant[input.participantId] >= challenge.target &&
      !challenge.completedByParticipantIds.includes(input.participantId)
    ) {
      challenge.completedByParticipantIds.push(input.participantId);
    }
  }
  return next;
}

export function reverseChoreMotivationCompletion(input: {
  state: ChoreMotivationState;
  activity: ChoreActivity;
  participantId: string;
}): ChoreMotivationState {
  const next = clone(input.state);
  if (next.mode === 'off' || next.processedActivityIds.includes(input.activity.id)) return next;
  const awarded = [...next.ledger]
    .reverse()
    .find(
      (entry) =>
        entry.occurrenceId === input.activity.occurrenceId &&
        entry.participantId === input.participantId &&
        entry.points > 0 &&
        !next.ledger.some((candidate) => candidate.reversesEntryId === entry.id)
    );
  next.processedActivityIds.push(input.activity.id);
  if (!awarded) return next;
  next.balancesByParticipant[input.participantId] = Math.max(
    0,
    (next.balancesByParticipant[input.participantId] ?? 0) - awarded.points
  );
  next.finalCompletionsByParticipant[input.participantId] = Math.max(
    0,
    (next.finalCompletionsByParticipant[input.participantId] ?? 0) - 1
  );
  next.ledger.push({
    id: `motivation:${input.activity.id}`,
    participantId: input.participantId,
    points: -awarded.points,
    reason: 'Chore reopened',
    timestamp: input.activity.timestamp,
    activityId: input.activity.id,
    occurrenceId: input.activity.occurrenceId,
    reversesEntryId: awarded.id,
  });
  return next;
}

export function adjustChorePoints(input: {
  state: ChoreMotivationState;
  manager: boolean;
  actorParticipantId: string;
  participantId: string;
  points: number;
  reason: string;
  timestamp?: string;
}): ChoreMotivationState {
  assertManager(input.manager);
  assertReason(input.reason);
  if (
    !Number.isSafeInteger(input.points) ||
    input.points === 0 ||
    Math.abs(input.points) > 10_000
  ) {
    throw new Error('A non-zero whole point adjustment is required');
  }
  const next = clone(input.state);
  const timestamp = input.timestamp ?? new Date().toISOString();
  next.balancesByParticipant[input.participantId] = Math.max(
    0,
    (next.balancesByParticipant[input.participantId] ?? 0) + input.points
  );
  next.ledger.push({
    id: `motivation:adjustment:${timestamp}:${input.participantId}`,
    participantId: input.participantId,
    points: input.points,
    reason: input.reason.trim(),
    timestamp,
    actorParticipantId: input.actorParticipantId,
  });
  return next;
}

export function upsertChoreReward(input: {
  state: ChoreMotivationState;
  manager: boolean;
  reward: ChoreReward;
}): ChoreMotivationState {
  assertManager(input.manager);
  if (!input.reward.id.trim() || !input.reward.title.trim())
    throw new Error('Reward details are required');
  assertPoints(input.reward.cost);
  const next = clone(input.state);
  next.rewardsById[input.reward.id] = clone(input.reward);
  return next;
}

export function requestChoreReward(input: {
  state: ChoreMotivationState;
  claimId: string;
  rewardId: string;
  participantId: string;
  timestamp?: string;
}): ChoreMotivationState {
  const next = clone(input.state);
  if (next.mode === 'off') throw new Error('Motivation mode is off');
  if (next.claimsById[input.claimId]) return next;
  const reward = next.rewardsById[input.rewardId];
  if (!reward?.enabled) throw new Error('Reward is unavailable');
  if ((next.balancesByParticipant[input.participantId] ?? 0) < reward.cost) {
    throw new Error('Not enough points for this reward');
  }
  const timestamp = input.timestamp ?? new Date().toISOString();
  next.claimsById[input.claimId] = {
    id: input.claimId,
    rewardId: input.rewardId,
    participantId: input.participantId,
    status: 'requested',
    requestedAt: timestamp,
    updatedAt: timestamp,
  };
  return next;
}

export function reviewChoreRewardClaim(input: {
  state: ChoreMotivationState;
  manager: boolean;
  claimId: string;
  managerParticipantId: string;
  decision: 'approve' | 'reject' | 'fulfill' | 'refund';
  reason: string;
  timestamp?: string;
}): ChoreMotivationState {
  assertManager(input.manager);
  assertReason(input.reason);
  const next = clone(input.state);
  const claim = next.claimsById[input.claimId];
  if (!claim) throw new Error('Reward claim was not found');
  const reward = next.rewardsById[claim.rewardId];
  if (!reward) throw new Error('Reward was not found');
  const timestamp = input.timestamp ?? new Date().toISOString();
  if (input.decision === 'approve') {
    if (claim.status !== 'requested') throw new Error('Only requested rewards can be approved');
    if ((next.balancesByParticipant[claim.participantId] ?? 0) < reward.cost) {
      throw new Error('Not enough points for this reward');
    }
    next.balancesByParticipant[claim.participantId] -= reward.cost;
    next.ledger.push({
      id: `motivation:reward:${claim.id}`,
      participantId: claim.participantId,
      points: -reward.cost,
      reason: `Reward approved: ${input.reason.trim()}`,
      timestamp,
      actorParticipantId: input.managerParticipantId,
    });
    claim.status = 'approved';
  } else if (input.decision === 'reject') {
    if (claim.status !== 'requested') throw new Error('Only requested rewards can be rejected');
    claim.status = 'rejected';
  } else if (input.decision === 'fulfill') {
    if (claim.status !== 'approved') throw new Error('Only approved rewards can be fulfilled');
    claim.status = 'fulfilled';
  } else {
    if (claim.status !== 'approved' && claim.status !== 'fulfilled') {
      throw new Error('Only approved or fulfilled rewards can be refunded');
    }
    next.balancesByParticipant[claim.participantId] =
      (next.balancesByParticipant[claim.participantId] ?? 0) + reward.cost;
    next.ledger.push({
      id: `motivation:refund:${claim.id}`,
      participantId: claim.participantId,
      points: reward.cost,
      reason: `Reward refunded: ${input.reason.trim()}`,
      timestamp,
      actorParticipantId: input.managerParticipantId,
    });
    claim.status = 'refunded';
  }
  claim.managerParticipantId = input.managerParticipantId;
  claim.reason = input.reason.trim();
  claim.updatedAt = timestamp;
  return next;
}

export function upsertChoreBadge(input: {
  state: ChoreMotivationState;
  manager: boolean;
  badge: ChoreBadgeMilestone;
}): ChoreMotivationState {
  assertManager(input.manager);
  if (!input.badge.id.trim() || !input.badge.title.trim() || input.badge.threshold < 1) {
    throw new Error('Valid badge details are required');
  }
  const next = clone(input.state);
  next.badgesById[input.badge.id] = clone(input.badge);
  return next;
}

export function upsertChoreChallenge(input: {
  state: ChoreMotivationState;
  manager: boolean;
  challenge: Omit<ChoreChallenge, 'progressByParticipant' | 'completedByParticipantIds'>;
}): ChoreMotivationState {
  assertManager(input.manager);
  if (
    !input.challenge.id.trim() ||
    !input.challenge.title.trim() ||
    input.challenge.target < 1 ||
    Date.parse(input.challenge.endsAt) <= Date.parse(input.challenge.startsAt)
  ) {
    throw new Error('Valid challenge details are required');
  }
  const next = clone(input.state);
  const existing = next.challengesById[input.challenge.id];
  next.challengesById[input.challenge.id] = {
    ...clone(input.challenge),
    progressByParticipant: existing?.progressByParticipant ?? {},
    completedByParticipantIds: existing?.completedByParticipantIds ?? [],
  };
  return next;
}
