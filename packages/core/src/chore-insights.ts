import type {
  ChoreActivity,
  ChoreActivityType,
  ChoreHistoryRetentionPolicy,
  ChoreWorkspaceData,
} from './chores';

export interface ChoreHistoryFilter {
  from?: string;
  to?: string;
  types?: ChoreActivityType[];
  participantId?: string;
  occurrenceId?: string;
  definitionId?: string;
}

export interface ChoreInsightMetric {
  due: number;
  completed: number;
  overdue: number;
  missed: number;
  completionRate: number;
  overdueRate: number;
  approvalTurnaroundMinutes: number | null;
  streakDays: number;
}

export interface ChoreProfileInsight extends ChoreInsightMetric {
  participantId: string;
  assigned: number;
  contributions: number;
}

export interface ChoreWorkloadBalance {
  status: 'balanced' | 'uneven' | 'insufficient_data';
  spread: number;
  assignmentsByParticipant: Record<string, number>;
}

export interface ChoreHouseholdInsights {
  from: string;
  to: string;
  household: ChoreInsightMetric;
  profiles: ChoreProfileInsight[];
  workload: ChoreWorkloadBalance;
}

export interface ChoreWorkloadSuggestion {
  fromParticipantId: string;
  toParticipantId: string;
  difference: number;
  reason: string;
}

export interface ChoreWeeklyReport {
  weekStart: string;
  weekEnd: string;
  completed: number;
  missed: number;
  carriedForward: number;
  pendingApproval: number;
  nextWeek: number;
  highlights: Array<{ type: 'completed' | 'missed' | 'upcoming'; definitionId?: string }>;
}

const DAY_MS = 86_400_000;

function assertTimestamp(value: string, name: string) {
  const parsed = Date.parse(value);
  if (!Number.isFinite(parsed)) throw new Error(`Invalid ${name} timestamp`);
  return parsed;
}

function rate(numerator: number, denominator: number) {
  return denominator === 0 ? 0 : Math.round((numerator / denominator) * 1000) / 10;
}

function uniqueEvents(events: readonly ChoreActivity[]) {
  const seen = new Set<string>();
  return events.filter((event) => {
    if (seen.has(event.id)) return false;
    seen.add(event.id);
    return true;
  });
}

export function filterChoreHistory(
  events: readonly ChoreActivity[],
  filters: ChoreHistoryFilter = {}
): ChoreActivity[] {
  const from = filters.from
    ? assertTimestamp(filters.from, 'history start')
    : Number.NEGATIVE_INFINITY;
  const to = filters.to ? assertTimestamp(filters.to, 'history end') : Number.POSITIVE_INFINITY;
  if (to < from) throw new Error('Chore history range is invalid');
  const types = filters.types ? new Set(filters.types) : null;
  return uniqueEvents(events)
    .filter((event) => {
      const timestamp = Date.parse(event.timestamp);
      return Number.isFinite(timestamp) && timestamp >= from && timestamp <= to;
    })
    .filter((event) => !types || types.has(event.type))
    .filter(
      (event) =>
        !filters.participantId ||
        event.actorParticipantId === filters.participantId ||
        event.participantId === filters.participantId ||
        event.assigneeIds?.includes(filters.participantId) ||
        event.previousAssigneeIds?.includes(filters.participantId)
    )
    .filter((event) => !filters.occurrenceId || event.occurrenceId === filters.occurrenceId)
    .filter((event) => !filters.definitionId || event.definitionId === filters.definitionId)
    .sort(
      (left, right) =>
        left.timestamp.localeCompare(right.timestamp) || left.id.localeCompare(right.id)
    );
}

function consecutiveCompletionDays(events: readonly ChoreActivity[], participantId?: string) {
  const days = [
    ...new Set(
      events
        .filter((event) => event.type === 'completed')
        .filter((event) => !participantId || event.actorParticipantId === participantId)
        .map((event) => event.timestamp.slice(0, 10))
    ),
  ]
    .sort()
    .reverse();
  if (days.length === 0) return 0;
  let streak = 1;
  for (let index = 1; index < days.length; index += 1) {
    const previous = Date.parse(`${days[index - 1]}T00:00:00.000Z`);
    const current = Date.parse(`${days[index]}T00:00:00.000Z`);
    if (previous - current !== DAY_MS) break;
    streak += 1;
  }
  return streak;
}

function approvalTurnaround(events: readonly ChoreActivity[], participantId?: string) {
  const completedByOccurrence = new Map<string, ChoreActivity>();
  const durations: number[] = [];
  for (const event of events) {
    if (!event.occurrenceId) continue;
    if (event.type === 'completed') {
      if (!participantId || event.actorParticipantId === participantId) {
        completedByOccurrence.set(event.occurrenceId, event);
      }
      continue;
    }
    if (event.type !== 'approved' && event.type !== 'rejected') continue;
    const completed = completedByOccurrence.get(event.occurrenceId);
    if (!completed) continue;
    const duration = Date.parse(event.timestamp) - Date.parse(completed.timestamp);
    if (duration >= 0) durations.push(duration / 60_000);
  }
  if (durations.length === 0) return null;
  return (
    Math.round((durations.reduce((sum, value) => sum + value, 0) / durations.length) * 10) / 10
  );
}

function metric(events: readonly ChoreActivity[], participantId?: string): ChoreInsightMetric {
  const dueEvents = events.filter((event) => event.type === 'due');
  const dueOccurrenceIds = new Set(
    dueEvents
      .filter((event) => !participantId || event.assigneeIds?.includes(participantId))
      .map((event) => event.occurrenceId)
      .filter((id): id is string => Boolean(id))
  );
  const completed = events.filter(
    (event) =>
      event.type === 'completed' &&
      (!participantId || (event.occurrenceId ? dueOccurrenceIds.has(event.occurrenceId) : false))
  ).length;
  const overdue = events.filter(
    (event) =>
      event.type === 'overdue' && (!participantId || event.assigneeIds?.includes(participantId))
  ).length;
  const missed = events.filter(
    (event) =>
      event.type === 'missed' && (!participantId || event.assigneeIds?.includes(participantId))
  ).length;
  const due = participantId ? dueOccurrenceIds.size : dueEvents.length;
  return {
    due,
    completed,
    overdue,
    missed,
    completionRate: rate(completed, due),
    overdueRate: rate(overdue, due),
    approvalTurnaroundMinutes: approvalTurnaround(events, participantId),
    streakDays: consecutiveCompletionDays(events, participantId),
  };
}

export function calculateChoreInsights(input: {
  events: readonly ChoreActivity[];
  participantIds: readonly string[];
  from: string;
  to: string;
}): ChoreHouseholdInsights {
  const events = filterChoreHistory(input.events, { from: input.from, to: input.to });
  const profiles = [...new Set(input.participantIds)].map((participantId) => {
    const profileMetric = metric(events, participantId);
    return {
      participantId,
      ...profileMetric,
      assigned: events.filter(
        (event) => event.type === 'due' && event.assigneeIds?.includes(participantId)
      ).length,
      contributions: events.filter(
        (event) => event.type === 'completed' && event.actorParticipantId === participantId
      ).length,
    };
  });
  const assignmentsByParticipant = Object.fromEntries(
    profiles.map((profile) => [profile.participantId, profile.assigned])
  );
  const assignmentCounts = Object.values(assignmentsByParticipant);
  const spread =
    assignmentCounts.length === 0
      ? 0
      : Math.max(...assignmentCounts) - Math.min(...assignmentCounts);
  return {
    from: input.from,
    to: input.to,
    household: metric(events),
    profiles,
    workload: {
      status:
        assignmentCounts.reduce((sum, count) => sum + count, 0) < 3
          ? 'insufficient_data'
          : spread <= 1
            ? 'balanced'
            : 'uneven',
      spread,
      assignmentsByParticipant,
    },
  };
}

export function suggestChoreWorkloadBalance(
  insights: ChoreHouseholdInsights
): ChoreWorkloadSuggestion[] {
  if (insights.workload.status !== 'uneven') return [];
  const sorted = [...insights.profiles].sort(
    (left, right) =>
      right.assigned - left.assigned || left.participantId.localeCompare(right.participantId)
  );
  const highest = sorted[0];
  const lowest = sorted.at(-1);
  if (!highest || !lowest || highest.assigned - lowest.assigned <= 1) return [];
  return [
    {
      fromParticipantId: highest.participantId,
      toParticipantId: lowest.participantId,
      difference: highest.assigned - lowest.assigned,
      reason: `${highest.participantId} has ${highest.assigned - lowest.assigned} more due assignments than ${lowest.participantId} in this period. Review future assignments; no changes were made.`,
    },
  ];
}

function mondayStart(timestamp: number) {
  const date = new Date(timestamp);
  const day = date.getUTCDay();
  return Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate() - ((day + 6) % 7));
}

export function buildChoreWeeklyReport(input: {
  workspace: ChoreWorkspaceData;
  events: readonly ChoreActivity[];
  now?: string;
}): ChoreWeeklyReport {
  const now = assertTimestamp(input.now ?? new Date().toISOString(), 'weekly report');
  const weekStart = mondayStart(now);
  const weekEnd = weekStart + 7 * DAY_MS - 1;
  const nextWeekEnd = weekStart + 14 * DAY_MS - 1;
  const events = filterChoreHistory(input.events, {
    from: new Date(weekStart).toISOString(),
    to: new Date(weekEnd).toISOString(),
  });
  const carriedForward = Object.values(input.workspace.occurrencesById).filter(
    (occurrence) =>
      Boolean(occurrence.carriedForwardFrom) &&
      Date.parse(occurrence.scheduledAt) >= weekStart &&
      Date.parse(occurrence.scheduledAt) <= weekEnd
  ).length;
  const nextWeekOccurrences = Object.values(input.workspace.occurrencesById).filter(
    (occurrence) => {
      const scheduledAt = Date.parse(occurrence.scheduledAt);
      return scheduledAt > weekEnd && scheduledAt <= nextWeekEnd;
    }
  );
  const completedEvents = events.filter((event) => event.type === 'completed');
  const missedEvents = events.filter((event) => event.type === 'missed');
  return {
    weekStart: new Date(weekStart).toISOString(),
    weekEnd: new Date(weekEnd).toISOString(),
    completed: completedEvents.length,
    missed: missedEvents.length,
    carriedForward,
    pendingApproval: Object.values(input.workspace.occurrencesById).filter(
      (occurrence) => occurrence.status === 'awaiting_approval'
    ).length,
    nextWeek: nextWeekOccurrences.length,
    highlights: [
      ...completedEvents.slice(0, 3).map((event) => ({
        type: 'completed' as const,
        definitionId: event.definitionId,
      })),
      ...missedEvents.slice(0, 3).map((event) => ({
        type: 'missed' as const,
        definitionId: event.definitionId,
      })),
      ...nextWeekOccurrences.slice(0, 3).map((occurrence) => ({
        type: 'upcoming' as const,
        definitionId: occurrence.definitionId,
      })),
    ].slice(0, 5),
  };
}

export function applyChoreHistoryRetention(
  events: readonly ChoreActivity[],
  policy: ChoreHistoryRetentionPolicy,
  now = new Date().toISOString()
): ChoreActivity[] {
  if (
    !Number.isSafeInteger(policy.maxAgeDays) ||
    policy.maxAgeDays < 30 ||
    policy.maxAgeDays > 3650
  ) {
    throw new Error('Chore history age must be between 30 and 3650 days');
  }
  if (
    !Number.isSafeInteger(policy.maxEvents) ||
    policy.maxEvents < 1000 ||
    policy.maxEvents > 100_000
  ) {
    throw new Error('Chore history event limit must be between 1000 and 100000');
  }
  const boundary = assertTimestamp(now, 'retention') - policy.maxAgeDays * DAY_MS;
  return uniqueEvents(events)
    .filter((event) => Date.parse(event.timestamp) >= boundary)
    .slice(-policy.maxEvents);
}

function csvCell(value: unknown) {
  const text = value === undefined ? '' : Array.isArray(value) ? value.join('|') : String(value);
  return `"${text.replace(/"/g, '""')}"`;
}

export function exportChoreHistory(
  events: readonly ChoreActivity[],
  format: 'json' | 'csv',
  filters: ChoreHistoryFilter = {}
) {
  const filtered = filterChoreHistory(events, filters);
  if (format === 'json') {
    return JSON.stringify(
      { contractVersion: 1, exportedAt: new Date().toISOString(), events: filtered },
      null,
      2
    );
  }
  const headers = [
    'id',
    'timestamp',
    'type',
    'occurrenceId',
    'definitionId',
    'actorParticipantId',
    'participantId',
    'assigneeIds',
    'reason',
  ];
  return [
    headers.map(csvCell).join(','),
    ...filtered.map((event) =>
      headers.map((key) => csvCell(event[key as keyof ChoreActivity])).join(',')
    ),
  ].join('\n');
}
