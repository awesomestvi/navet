import {
  type ChoreMission,
  type ChoreRewardGoal,
  normalizeChoreExperienceState,
} from '@navet/core/chore-experience';
import {
  type ChoreDefinition,
  type ChoreOccurrence,
  type ChoreWorkspaceData,
  getChoreExperiencePointBalances,
  getChoreTiming,
} from '@navet/core/chores';

const DAY_MS = 86_400_000;

export interface ChoreRoomSummary {
  canonicalId: string;
  label: string;
  total: number;
  remaining: number;
  completed: number;
}

export interface ChoreHousePulse {
  completed: number;
  total: number;
  remaining: number;
  overdue: number;
  percent: number;
  pointsEarned: number;
  strongDays: number;
  streakDays: number;
}

export interface ChoreMissionProgress {
  mission: ChoreMission;
  completed: number;
  total: number;
  percent: number;
}

export interface ChoreRewardProgress {
  goal: ChoreRewardGoal;
  points: number;
  percent: number;
}

function startOfLocalDay(value: Date) {
  return new Date(value.getFullYear(), value.getMonth(), value.getDate()).getTime();
}

function offsetLocalDay(dayStart: number, offset: number) {
  const day = new Date(dayStart);
  return new Date(day.getFullYear(), day.getMonth(), day.getDate() + offset).getTime();
}

function isFinal(occurrence: ChoreOccurrence) {
  return occurrence.status === 'done';
}

function isVisibleWork(occurrence: ChoreOccurrence) {
  return occurrence.status !== 'skipped';
}

function occursOnLocalDay(occurrence: ChoreOccurrence, dayStart: number) {
  const scheduled = Date.parse(occurrence.scheduledAt);
  return scheduled >= dayStart && scheduled < offsetLocalDay(dayStart, 1);
}

function definitionFor(data: ChoreWorkspaceData, occurrence: ChoreOccurrence) {
  const definition = data.definitionsById[occurrence.definitionId];
  return definition && !definition.archivedAt ? definition : undefined;
}

export function getHouseholdTodayOccurrences(
  data: ChoreWorkspaceData,
  now = new Date()
): ChoreOccurrence[] {
  const dayStart = startOfLocalDay(now);
  return Object.values(data.occurrencesById)
    .filter((occurrence) => {
      if (!definitionFor(data, occurrence) || !isVisibleWork(occurrence)) return false;
      if (occursOnLocalDay(occurrence, dayStart)) return true;
      return !isFinal(occurrence) && getChoreTiming(occurrence, now) === 'overdue';
    })
    .sort((left, right) => {
      const statePriority = (occurrence: ChoreOccurrence) => {
        if (occurrence.status === 'awaiting_approval') return 0;
        if (getChoreTiming(occurrence, now) === 'overdue') return 1;
        if (occurrence.status === 'claimed') return 2;
        if (occurrence.status === 'done') return 4;
        return 3;
      };
      return (
        statePriority(left) - statePriority(right) ||
        Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt)
      );
    });
}

export function getTodayChoresForParticipant(
  data: ChoreWorkspaceData,
  participantId: string,
  now = new Date()
) {
  return getHouseholdTodayOccurrences(data, now).filter((occurrence) => {
    const definition = definitionFor(data, occurrence);
    return (
      participantId === 'all' ||
      occurrence.assigneeIds.includes(participantId) ||
      definition?.approval.approverIds.includes(participantId)
    );
  });
}

export function getUpcomingChores(
  data: ChoreWorkspaceData,
  participantId: string,
  now = new Date(),
  days = 7
) {
  const todayEnd = offsetLocalDay(startOfLocalDay(now), 1);
  const boundary = offsetLocalDay(todayEnd, days);
  return Object.values(data.occurrencesById)
    .filter((occurrence) => {
      const scheduled = Date.parse(occurrence.scheduledAt);
      const definition = definitionFor(data, occurrence);
      return (
        Boolean(definition) &&
        isVisibleWork(occurrence) &&
        !isFinal(occurrence) &&
        scheduled >= todayEnd &&
        scheduled < boundary &&
        (participantId === 'all' ||
          occurrence.assigneeIds.includes(participantId) ||
          definition?.approval.approverIds.includes(participantId))
      );
    })
    .sort((left, right) => Date.parse(left.scheduledAt) - Date.parse(right.scheduledAt));
}

export function getCompletedPoints(
  data: ChoreWorkspaceData,
  occurrences: readonly ChoreOccurrence[],
  participantId?: string
) {
  const experience = normalizeChoreExperienceState(data.experience);
  return occurrences.reduce((total, occurrence) => {
    if (!isFinal(occurrence)) return total;
    if (participantId && occurrence.completedBy !== participantId) return total;
    return total + (experience.presentationByDefinitionId[occurrence.definitionId]?.points ?? 0);
  }, 0);
}

function getStrongDayCount(data: ChoreWorkspaceData, now: Date) {
  const today = startOfLocalDay(now);
  let strongDays = 0;
  for (let offset = 0; offset < 7; offset += 1) {
    const dayStart = offsetLocalDay(today, -offset);
    const occurrences = Object.values(data.occurrencesById).filter(
      (occurrence) =>
        definitionFor(data, occurrence) &&
        isVisibleWork(occurrence) &&
        occursOnLocalDay(occurrence, dayStart)
    );
    if (occurrences.length === 0) continue;
    const completionRate = occurrences.filter(isFinal).length / occurrences.length;
    if (completionRate >= 0.75) strongDays += 1;
  }
  return strongDays;
}

function getCompletionStreak(data: ChoreWorkspaceData, now: Date) {
  const completionDays = new Set(
    Object.values(data.occurrencesById)
      .filter((occurrence) => definitionFor(data, occurrence) && isFinal(occurrence))
      .map((occurrence) =>
        startOfLocalDay(new Date(occurrence.completedAt ?? occurrence.scheduledAt))
      )
  );
  const latestDay = Math.max(...completionDays);
  const today = startOfLocalDay(now);
  if (!Number.isFinite(latestDay) || latestDay < offsetLocalDay(today, -1)) return 0;

  let streakDays = 0;
  let cursor = latestDay;
  while (completionDays.has(cursor)) {
    streakDays += 1;
    cursor = offsetLocalDay(cursor, -1);
  }
  return streakDays;
}

export function getHousePulse(data: ChoreWorkspaceData, now = new Date()): ChoreHousePulse {
  const occurrences = getHouseholdTodayOccurrences(data, now);
  const completed = occurrences.filter(isFinal).length;
  const total = occurrences.length;
  return {
    completed,
    total,
    remaining: Math.max(0, total - completed),
    overdue: occurrences.filter(
      (occurrence) => !isFinal(occurrence) && getChoreTiming(occurrence, now) === 'overdue'
    ).length,
    percent: total === 0 ? 100 : Math.round((completed / total) * 100),
    pointsEarned: getCompletedPoints(data, occurrences),
    strongDays: getStrongDayCount(data, now),
    streakDays: getCompletionStreak(data, now),
  };
}

export function getRoomChoreSummaries(
  data: ChoreWorkspaceData,
  now = new Date()
): ChoreRoomSummary[] {
  const summaries = new Map<string, ChoreRoomSummary>();
  for (const occurrence of getHouseholdTodayOccurrences(data, now)) {
    const definition = definitionFor(data, occurrence);
    const room = definition?.roomRef;
    if (!room) continue;
    const summary = summaries.get(room.canonicalId) ?? {
      canonicalId: room.canonicalId,
      label: room.label,
      total: 0,
      remaining: 0,
      completed: 0,
    };
    summary.total += 1;
    if (isFinal(occurrence)) summary.completed += 1;
    else summary.remaining += 1;
    summaries.set(room.canonicalId, summary);
  }
  return [...summaries.values()].sort(
    (left, right) => right.remaining - left.remaining || left.label.localeCompare(right.label)
  );
}

export function getRoomTodayChores(
  data: ChoreWorkspaceData,
  room: { label: string; canonicalIds?: readonly string[] },
  now = new Date()
) {
  const normalizedLabel = room.label.trim().toLowerCase();
  const canonicalIds = new Set(room.canonicalIds ?? []);

  return getHouseholdTodayOccurrences(data, now).filter((occurrence) => {
    const roomRef = definitionFor(data, occurrence)?.roomRef;
    if (!roomRef) return false;
    return (
      canonicalIds.has(roomRef.canonicalId) ||
      roomRef.label.trim().toLowerCase() === normalizedLabel
    );
  });
}

function occurrencesForMission(data: ChoreWorkspaceData, mission: ChoreMission, now: Date) {
  const startsAt = Date.parse(mission.startsAt ?? mission.createdAt);
  const endsAt = mission.endsAt ? Date.parse(mission.endsAt) : Number.POSITIVE_INFINITY;
  const nowTime = now.getTime();
  return Object.values(data.occurrencesById).filter((occurrence) => {
    const scheduled = Date.parse(occurrence.scheduledAt);
    return (
      mission.definitionIds.includes(occurrence.definitionId) &&
      scheduled >= startsAt &&
      scheduled <= endsAt &&
      (scheduled <= nowTime + 7 * DAY_MS || mission.status === 'complete')
    );
  });
}

export function getMissionProgress(
  data: ChoreWorkspaceData,
  mission: ChoreMission,
  now = new Date()
): ChoreMissionProgress {
  const occurrences = occurrencesForMission(data, mission, now);
  const completedDefinitions = new Set(
    occurrences.filter(isFinal).map((occurrence) => occurrence.definitionId)
  );
  const total = mission.definitionIds.length;
  const completed = mission.definitionIds.filter((id) => completedDefinitions.has(id)).length;
  return {
    mission: completed === total && total > 0 ? { ...mission, status: 'complete' } : mission,
    completed,
    total,
    percent: total === 0 ? 0 : Math.round((completed / total) * 100),
  };
}

export function getMissionProgressList(data: ChoreWorkspaceData, now = new Date()) {
  const experience = normalizeChoreExperienceState(data.experience);
  const statusOrder = { active: 0, upcoming: 1, complete: 2 } as const;
  return Object.values(experience.missionsById)
    .map((mission) => getMissionProgress(data, mission, now))
    .sort(
      (left, right) =>
        statusOrder[left.mission.status] - statusOrder[right.mission.status] ||
        Date.parse(left.mission.startsAt ?? left.mission.createdAt) -
          Date.parse(right.mission.startsAt ?? right.mission.createdAt)
    );
}

export function getRewardProgressList(data: ChoreWorkspaceData): ChoreRewardProgress[] {
  const experience = normalizeChoreExperienceState(data.experience);
  const balances = getChoreExperiencePointBalances(data);
  return Object.values(experience.rewardGoalsById)
    .filter((goal) => goal.enabled)
    .map((goal) => {
      const points =
        (goal.startingPoints ?? 0) +
        (goal.type === 'family'
          ? Object.values(balances).reduce((total, balance) => total + balance, 0) +
            (experience.householdBonusPoints ?? 0)
          : goal.participantId
            ? (balances[goal.participantId] ?? 0)
            : 0);
      return {
        goal,
        points,
        percent: Math.min(100, Math.round((points / goal.targetPoints) * 100)),
      };
    })
    .sort(
      (left, right) =>
        right.percent - left.percent || left.goal.title.localeCompare(right.goal.title)
    );
}

export function getDefinition(
  data: ChoreWorkspaceData,
  occurrence: ChoreOccurrence
): ChoreDefinition | undefined {
  return definitionFor(data, occurrence);
}
