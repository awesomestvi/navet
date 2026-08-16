export const CHORE_EXPERIENCE_VERSION = 1 as const;

export type ChoreGamificationMode = 'off' | 'light' | 'family' | 'adventure';

export interface ChorePresentationMetadata {
  estimatedMinutes?: number;
  points?: number;
  childTitle?: string;
  category?: string;
  icon?: string;
  color?: string;
}

export type ChoreMissionStatus = 'upcoming' | 'active' | 'complete';

export interface ChoreMission {
  id: string;
  title: string;
  description?: string;
  definitionIds: string[];
  status: ChoreMissionStatus;
  startsAt?: string;
  endsAt?: string;
  rewardPoints?: number;
  createdAt: string;
  updatedAt: string;
}

export type ChoreRewardType = 'instant' | 'saving' | 'family' | 'experience';

export interface ChoreRewardGoal {
  id: string;
  title: string;
  type: ChoreRewardType;
  targetPoints: number;
  participantId?: string;
  startingPoints?: number;
  enabled: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface ChoreExperienceState {
  version: typeof CHORE_EXPERIENCE_VERSION;
  setupStartedAt?: string;
  setupCompletedAt?: string;
  gamificationMode: ChoreGamificationMode;
  presentationByDefinitionId: Record<string, ChorePresentationMetadata>;
  missionsById: Record<string, ChoreMission>;
  rewardGoalsById: Record<string, ChoreRewardGoal>;
  earnedPointsByParticipant?: Record<string, number>;
  householdBonusPoints?: number;
  awardedMissionIds?: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isOptionalBoundedInteger(value: unknown, maximum: number) {
  return (
    value === undefined ||
    (Number.isSafeInteger(value) && Number(value) >= 0 && Number(value) <= maximum)
  );
}

function isOptionalTimestamp(value: unknown) {
  return value === undefined || (typeof value === 'string' && Number.isFinite(Date.parse(value)));
}

function isPresentationMetadata(value: unknown): value is ChorePresentationMetadata {
  return (
    isRecord(value) &&
    isOptionalBoundedInteger(value.estimatedMinutes, 24 * 60) &&
    isOptionalBoundedInteger(value.points, 10_000) &&
    (value.childTitle === undefined || typeof value.childTitle === 'string') &&
    (value.category === undefined || typeof value.category === 'string') &&
    (value.icon === undefined || typeof value.icon === 'string') &&
    (value.color === undefined ||
      (typeof value.color === 'string' && /^#[0-9a-fA-F]{6}$/.test(value.color)))
  );
}

function isMission(value: unknown, expectedId: string): value is ChoreMission {
  return (
    isRecord(value) &&
    value.id === expectedId &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    (value.description === undefined || typeof value.description === 'string') &&
    Array.isArray(value.definitionIds) &&
    value.definitionIds.length > 0 &&
    value.definitionIds.every((id) => typeof id === 'string' && id.length > 0) &&
    ['upcoming', 'active', 'complete'].includes(String(value.status)) &&
    isOptionalTimestamp(value.startsAt) &&
    isOptionalTimestamp(value.endsAt) &&
    isOptionalBoundedInteger(value.rewardPoints, 100_000) &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt))
  );
}

function isRewardGoal(value: unknown, expectedId: string): value is ChoreRewardGoal {
  return (
    isRecord(value) &&
    value.id === expectedId &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    ['instant', 'saving', 'family', 'experience'].includes(String(value.type)) &&
    Number.isSafeInteger(value.targetPoints) &&
    Number(value.targetPoints) > 0 &&
    Number(value.targetPoints) <= 1_000_000 &&
    (value.participantId === undefined || typeof value.participantId === 'string') &&
    isOptionalBoundedInteger(value.startingPoints, 1_000_000) &&
    typeof value.enabled === 'boolean' &&
    typeof value.createdAt === 'string' &&
    Number.isFinite(Date.parse(value.createdAt)) &&
    typeof value.updatedAt === 'string' &&
    Number.isFinite(Date.parse(value.updatedAt))
  );
}

export function createChoreExperienceState(): ChoreExperienceState {
  return {
    version: CHORE_EXPERIENCE_VERSION,
    gamificationMode: 'off',
    presentationByDefinitionId: {},
    missionsById: {},
    rewardGoalsById: {},
    earnedPointsByParticipant: {},
    householdBonusPoints: 0,
    awardedMissionIds: [],
  };
}

export function isChoreExperienceState(value: unknown): value is ChoreExperienceState {
  return (
    isRecord(value) &&
    value.version === CHORE_EXPERIENCE_VERSION &&
    isOptionalTimestamp(value.setupStartedAt) &&
    isOptionalTimestamp(value.setupCompletedAt) &&
    ['off', 'light', 'family', 'adventure'].includes(String(value.gamificationMode)) &&
    isRecord(value.presentationByDefinitionId) &&
    Object.values(value.presentationByDefinitionId).every(isPresentationMetadata) &&
    isRecord(value.missionsById) &&
    Object.entries(value.missionsById).every(([id, mission]) => isMission(mission, id)) &&
    isRecord(value.rewardGoalsById) &&
    Object.entries(value.rewardGoalsById).every(([id, goal]) => isRewardGoal(goal, id)) &&
    (value.earnedPointsByParticipant === undefined ||
      (isRecord(value.earnedPointsByParticipant) &&
        Object.values(value.earnedPointsByParticipant).every((points) =>
          isOptionalBoundedInteger(points, 1_000_000_000)
        ))) &&
    isOptionalBoundedInteger(value.householdBonusPoints, 1_000_000_000) &&
    (value.awardedMissionIds === undefined ||
      (Array.isArray(value.awardedMissionIds) &&
        value.awardedMissionIds.every((id) => typeof id === 'string' && id.length > 0)))
  );
}

export function normalizeChoreExperienceState(value: unknown): ChoreExperienceState {
  return isChoreExperienceState(value) ? value : createChoreExperienceState();
}
