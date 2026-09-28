import type {
  ChorePointTransaction,
  ChoreProgressAward,
  ChoreProgressTarget,
} from './chore-experience.ts';
import type { ChoreOccurrence } from './chores.ts';

export function progressCycleKey(cycle: ChoreProgressTarget['cycle'], at: string): string {
  if (cycle === 'monthly') return at.slice(0, 7);
  if (cycle === 'weekly') {
    const date = new Date(at);
    const monday = Date.UTC(
      date.getUTCFullYear(),
      date.getUTCMonth(),
      date.getUTCDate() - ((date.getUTCDay() + 6) % 7)
    );
    return new Date(monday).toISOString().slice(0, 10);
  }
  return 'once';
}

function inCycle(cycle: ChoreProgressTarget['cycle'], at: string, cycleKey: string): boolean {
  return progressCycleKey(cycle, at) === cycleKey;
}

/** A streak advances on a completed due day, resets on a missed due day, and ignores days without due work. */
export function choreTargetProgress(
  target: ChoreProgressTarget,
  participantId: string,
  occurrences: readonly ChoreOccurrence[],
  transactions: readonly ChorePointTransaction[],
  at: string
): number {
  const cycleKey = progressCycleKey(target.cycle, at);
  const relevant = occurrences.filter(
    (occurrence) =>
      (!target.definitionIds?.length || target.definitionIds.includes(occurrence.definitionId)) &&
      inCycle(target.cycle, occurrence.completedAt ?? occurrence.scheduledAt, cycleKey)
  );
  const completed = relevant.filter(
    (occurrence) => occurrence.status === 'done' && occurrence.completedBy === participantId
  );
  if (target.metric === 'selected_chore' || target.metric === 'count') return completed.length;
  if (target.metric === 'points') {
    return Math.max(
      0,
      transactions
        .filter(
          (item) =>
            item.participantId === participantId &&
            (item.kind === 'completion' || item.kind === 'reopen') &&
            inCycle(target.cycle, item.timestamp, cycleKey) &&
            (!target.definitionIds?.length ||
              relevant.some((occurrence) => occurrence.id === item.occurrenceId))
        )
        .reduce((sum, item) => sum + item.pointsDelta, 0)
    );
  }
  if (target.metric === 'days') {
    const days: string[] = [];
    for (let index = 0; index < completed.length; index += 1) {
      const occurrence = completed[index];
      const day = occurrence.completedAt?.slice(0, 10);
      if (day && !days.includes(day)) days.push(day);
    }
    return days.length;
  }
  const days: Record<string, 'done' | 'missed'> = {};
  for (let index = 0; index < relevant.length; index += 1) {
    const occurrence = relevant[index];
    if (occurrence.status === 'missed' && occurrence.assigneeIds.includes(participantId)) {
      days[occurrence.scheduledAt.slice(0, 10)] = 'missed';
    } else if (occurrence.status === 'done' && occurrence.completedBy === participantId) {
      const day = occurrence.scheduledAt.slice(0, 10);
      if (days[day] !== 'missed') days[day] = 'done';
    }
  }
  let streak = 0;
  const sortedDays = Object.keys(days).sort();
  for (let index = 0; index < sortedDays.length; index += 1) {
    const day = sortedDays[index];
    streak = days[day] === 'done' ? streak + 1 : 0;
  }
  return streak;
}

export function earnChoreProgressAwards(input: {
  badges: Record<string, ChoreProgressTarget>;
  achievements: Record<string, ChoreProgressTarget>;
  participantIds: readonly string[];
  occurrences: readonly ChoreOccurrence[];
  transactions: readonly ChorePointTransaction[];
  existingAwards: readonly ChoreProgressAward[];
  at: string;
}): { awards: ChoreProgressAward[]; transactions: ChorePointTransaction[] } {
  const awards: ChoreProgressAward[] = [];
  const transactions: ChorePointTransaction[] = [];
  const targets = Object.values(input.badges).concat(Object.values(input.achievements));
  for (let targetIndex = 0; targetIndex < targets.length; targetIndex += 1) {
    const target = targets[targetIndex];
    const cycleKey = progressCycleKey(target.cycle, input.at);
    for (
      let participantIndex = 0;
      participantIndex < input.participantIds.length;
      participantIndex += 1
    ) {
      const participantId = input.participantIds[participantIndex];
      if (target.participantId && target.participantId !== participantId) continue;
      const id = `progress:${target.id}:${participantId}:${cycleKey}`;
      if (
        input.existingAwards.some((award) => award.id === id) ||
        awards.some((award) => award.id === id)
      )
        continue;
      if (
        choreTargetProgress(
          target,
          participantId,
          input.occurrences,
          input.transactions,
          input.at
        ) < target.target
      )
        continue;
      awards.push({ id, targetId: target.id, participantId, cycleKey, awardedAt: input.at });
      if (target.awardPoints)
        transactions.push({
          id: `points:${id}`,
          participantId,
          pointsDelta: target.awardPoints,
          kind: 'progress_award',
          timestamp: input.at,
        });
    }
  }
  return { awards, transactions };
}
