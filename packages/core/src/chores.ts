import {
  type ChoreExperienceState,
  type ChoreMission,
  createChoreExperienceState,
  isChoreExperienceState,
} from './chore-experience.ts';

export const CHORE_WORKSPACE_SCHEMA_VERSION = 2 as const;

export type ChoreParticipantCapability = 'complete' | 'approve' | 'manage';

export interface ChoreParticipant {
  id: string;
  displayName: string;
  color?: string;
  avatarUrl?: string;
  avatarIcon?: string;
  capabilities: ChoreParticipantCapability[];
  pausedAt?: string;
  linkedAccountId?: string;
  linkedPersonEntityId?: string;
  reminderPreferences?: {
    enabled: boolean;
    quietHours?: {
      start: string;
      end: string;
      timeZone?: string;
    };
    destination?: {
      type: 'in_app' | 'home_assistant';
      target?: string;
    };
  };
  createdAt: string;
  updatedAt: string;
}

export type ChoreAssignmentMode = 'person' | 'anyone' | 'everyone' | 'rotation';

export interface ChoreAssignment {
  mode: ChoreAssignmentMode;
  participantIds: string[];
  rotationCursor?: number;
  rotationReset?: 'never' | 'weekly' | 'monthly';
  participantScheduleOverrides?: Record<
    string,
    {
      daysOfWeek?: number[];
      times?: string[];
    }
  >;
}

export interface ChoreScheduleOptions {
  endDate?: string;
  excludedDates?: string[];
  times?: string[];
}

export type ChoreSchedule = ChoreScheduleOptions &
  (
    | {
        frequency: 'once';
        date: string;
        time: string;
        timeZone: string;
      }
    | {
        frequency: 'daily';
        startDate: string;
        time: string;
        timeZone: string;
        daysOfWeek?: number[];
        intervalDays?: number;
      }
    | {
        frequency: 'weekly';
        startDate: string;
        time: string;
        timeZone: string;
        daysOfWeek: number[];
        intervalWeeks?: number;
      }
    | {
        frequency: 'monthly';
        startDate: string;
        time: string;
        timeZone: string;
        dayOfMonth?: number;
        nthWeekday?: {
          weekday: number;
          ordinal: 1 | 2 | 3 | 4 | 5 | -1;
        };
      }
    | {
        frequency: 'after_completion';
        startDate: string;
        time: string;
        timeZone: string;
        intervalDays: number;
      }
  );

export interface ChoreClaimPolicy {
  required: boolean;
  expiresAfterMinutes?: number;
  allowSteal: boolean;
}

export interface ChoreMissedPolicy {
  graceMinutes: number;
  action: 'none' | 'skip' | 'carry_forward';
  carryForwardDays?: number;
}

export interface ChoreReminderPolicy {
  enabled: boolean;
  beforeDueMinutes: number[];
  atDue: boolean;
  overdueEveryMinutes?: number;
  maxOverdueReminders?: number;
  approvalAfterMinutes?: number;
}

export interface ChoreApprovalPolicy {
  required: boolean;
  approverIds: string[];
}

export interface ChoreDefinition {
  id: string;
  title: string;
  description?: string;
  icon?: string;
  roomRef?: {
    canonicalId: string;
    label: string;
  };
  enabled: boolean;
  assignment: ChoreAssignment;
  schedule: ChoreSchedule;
  dueWindowMinutes: number;
  approval: ChoreApprovalPolicy;
  claimPolicy?: ChoreClaimPolicy;
  missedPolicy?: ChoreMissedPolicy;
  reminderPolicy?: ChoreReminderPolicy;
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export type ChoreOccurrenceStatus =
  | 'available'
  | 'claimed'
  | 'awaiting_approval'
  | 'done'
  | 'skipped'
  | 'missed';

export type ChoreTiming = 'upcoming' | 'due' | 'overdue';

export interface ChoreOccurrence {
  id: string;
  definitionId: string;
  scheduledAt: string;
  dueAt: string;
  assigneeIds: string[];
  assignmentSlot: string;
  status: ChoreOccurrenceStatus;
  claimedBy?: string;
  claimedAt?: string;
  completedBy?: string;
  completedAt?: string;
  approvedBy?: string;
  approvedAt?: string;
  skippedBy?: string;
  skippedAt?: string;
  missedAt?: string;
  carriedForwardTo?: string;
  carriedForwardFrom?: string;
  updatedAt: string;
}

export type ChoreActivityType =
  | 'participant_created'
  | 'participant_updated'
  | 'definition_created'
  | 'definition_updated'
  | 'definition_archived'
  | 'workspace_materialized'
  | 'workspace_imported'
  | 'workspace_reset'
  | 'retention_updated'
  | 'experience_updated'
  | 'points_adjusted'
  | 'occurrence_created'
  | 'due'
  | 'overdue'
  | 'claimed'
  | 'completed'
  | 'approved'
  | 'rejected'
  | 'skipped'
  | 'reopened'
  | 'reassigned'
  | 'missed'
  | 'reminder_acknowledged'
  | 'outbox_delivery_updated';

export interface ChoreActivity {
  id: string;
  commandId: string;
  occurrenceId?: string;
  definitionId?: string;
  participantId?: string;
  type: ChoreActivityType;
  actorParticipantId?: string;
  reason?: string;
  pointsDelta?: number;
  previousAssigneeIds?: string[];
  assigneeIds?: string[];
  outboxId?: string;
  timestamp: string;
}

export type ChoreOutboxStatus = 'pending' | 'delivered' | 'failed';
export type ChoreReminderEventType =
  | 'reminder_before_due'
  | 'reminder_due'
  | 'reminder_overdue'
  | 'reminder_approval';
export type ChoreOutboxEventType = ChoreActivityType | ChoreReminderEventType;

export interface ChoreOutboxItem {
  id: string;
  activityId: string;
  eventType: ChoreOutboxEventType;
  status: ChoreOutboxStatus;
  attempts: number;
  createdAt: string;
  nextAttemptAt: string;
  lastAttemptAt?: string;
  deliveredAt?: string;
  lastError?: string;
  occurrenceId?: string;
  participantId?: string;
  destination?: 'in_app' | 'home_assistant';
  destinationTarget?: string;
}

export interface ChoreWorkspaceData {
  schemaVersion: typeof CHORE_WORKSPACE_SCHEMA_VERSION;
  participantsById: Record<string, ChoreParticipant>;
  definitionsById: Record<string, ChoreDefinition>;
  occurrencesById: Record<string, ChoreOccurrence>;
  activity: ChoreActivity[];
  outbox: ChoreOutboxItem[];
  historyRetention?: ChoreHistoryRetentionPolicy;
  /** Optional additive household presentation, mission, and reward data. */
  experience?: ChoreExperienceState;
}

export interface ChoreHistoryRetentionPolicy {
  maxAgeDays: number;
  maxEvents: number;
}

export const DEFAULT_CHORE_HISTORY_RETENTION: ChoreHistoryRetentionPolicy = {
  maxAgeDays: 730,
  maxEvents: 50_000,
};

export type ChoreOccurrenceCommand =
  | { type: 'claim'; participantId: string }
  | { type: 'complete'; participantId: string }
  | { type: 'approve'; participantId: string; managerOverride?: boolean; reason?: string }
  | { type: 'reject'; participantId: string; managerOverride?: boolean; reason?: string }
  | { type: 'skip'; participantId: string; reason: string }
  | { type: 'reopen'; participantId: string; reason: string }
  | { type: 'reassign'; participantId: string; assigneeIds: string[]; reason: string };

export interface ChoreWorkspaceOccurrenceAction {
  type: 'occurrence_action';
  occurrenceId: string;
  action: ChoreOccurrenceCommand;
}

export interface ChoreWorkspaceParticipantCreateAction {
  type: 'participant_create';
  participant: ChoreParticipant;
  actorParticipantId?: string;
}

export interface ChoreWorkspaceParticipantUpdateAction {
  type: 'participant_update';
  participant: ChoreParticipant;
  actorParticipantId: string;
}

export interface ChoreWorkspaceDefinitionCreateAction {
  type: 'definition_create';
  definition: ChoreDefinition;
  actorParticipantId: string;
}

export interface ChoreWorkspaceDefinitionUpdateAction {
  type: 'definition_update';
  definition: ChoreDefinition;
  actorParticipantId: string;
}

export interface ChoreWorkspaceDefinitionArchiveAction {
  type: 'definition_archive';
  definitionId: string;
  actorParticipantId: string;
}

export interface ChoreWorkspaceDefinitionRestoreAction {
  type: 'definition_restore';
  definitionId: string;
  actorParticipantId: string;
}

export interface ChoreWorkspaceMaterializeAction {
  type: 'materialize_occurrences';
  rangeStart: string;
  rangeEnd: string;
}

export interface ChoreWorkspaceReminderAcknowledgeAction {
  type: 'reminder_acknowledge';
  outboxId: string;
  actorParticipantId: string;
}

export interface ChoreWorkspaceOutboxDeliveryAction {
  type: 'outbox_delivery_update';
  outboxId: string;
  status: 'delivered' | 'failed';
  error?: string;
}

export interface ChoreWorkspaceRetentionUpdateAction {
  type: 'retention_update';
  actorParticipantId: string;
  policy: ChoreHistoryRetentionPolicy;
}

export interface ChoreWorkspaceExperienceUpdateAction {
  type: 'experience_update';
  actorParticipantId: string;
  experience: ChoreExperienceState;
}

export interface ChoreWorkspaceExperiencePointsAdjustAction {
  type: 'experience_points_adjust';
  actorParticipantId: string;
  participantId: string;
  pointsDelta: number;
  reason?: string;
}

export type ChoreWorkspaceAction =
  | ChoreWorkspaceOccurrenceAction
  | ChoreWorkspaceParticipantCreateAction
  | ChoreWorkspaceParticipantUpdateAction
  | ChoreWorkspaceDefinitionCreateAction
  | ChoreWorkspaceDefinitionUpdateAction
  | ChoreWorkspaceDefinitionArchiveAction
  | ChoreWorkspaceDefinitionRestoreAction
  | ChoreWorkspaceMaterializeAction
  | ChoreWorkspaceReminderAcknowledgeAction
  | ChoreWorkspaceOutboxDeliveryAction
  | ChoreWorkspaceRetentionUpdateAction
  | ChoreWorkspaceExperienceUpdateAction
  | ChoreWorkspaceExperiencePointsAdjustAction;

export interface ApplyChoreCommandInput {
  commandId: string;
  command: ChoreOccurrenceCommand;
  definition: ChoreDefinition;
  occurrence: ChoreOccurrence;
  timestamp: string;
}

export interface ApplyChoreCommandResult {
  occurrence: ChoreOccurrence;
  activity: ChoreActivity;
}

export interface ApplyChoreWorkspaceOccurrenceCommandInput {
  commandId: string;
  command: ChoreOccurrenceCommand;
  occurrenceId: string;
  timestamp: string;
  workspace: ChoreWorkspaceData;
}

export interface ApplyChoreWorkspaceOccurrenceCommandResult {
  activity: ChoreActivity;
  data: ChoreWorkspaceData;
  occurrence: ChoreOccurrence;
}

export interface ApplyChoreWorkspaceActionInput {
  commandId: string;
  action: ChoreWorkspaceAction;
  timestamp: string;
  workspace: ChoreWorkspaceData;
}

export interface ApplyChoreWorkspaceActionResult {
  activity: ChoreActivity;
  /** Additional immutable lifecycle events produced by one authoritative action. */
  additionalActivities?: ChoreActivity[];
  data: ChoreWorkspaceData;
}

export interface RunChoreWorkspaceSchedulerResult {
  activities: ChoreActivity[];
  data: ChoreWorkspaceData;
  outboxItems: ChoreOutboxItem[];
}

export interface RunChoreWorkspaceSchedulerOptions {
  /** IDs already committed to the authority's append-only event history. */
  existingEventIds?: ReadonlySet<string>;
}

export interface MaterializeChoreOccurrencesInput {
  definition: ChoreDefinition;
  participantsById: Record<string, ChoreParticipant>;
  rangeStart: string;
  rangeEnd: string;
  existingOccurrences?: Record<string, ChoreOccurrence>;
  latestCompletedAt?: string;
}

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;
const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

function parseDateKey(dateKey: string) {
  if (!DATE_PATTERN.test(dateKey)) {
    throw new Error(`Invalid chore date: ${dateKey}`);
  }

  const [year, month, day] = dateKey.split('-').map(Number);
  const candidate = new Date(Date.UTC(year, month - 1, day));
  if (
    candidate.getUTCFullYear() !== year ||
    candidate.getUTCMonth() !== month - 1 ||
    candidate.getUTCDate() !== day
  ) {
    throw new Error(`Invalid chore date: ${dateKey}`);
  }

  return { year, month, day };
}

function formatDateKey(date: Date) {
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

function addCalendarDays(dateKey: string, days: number) {
  const { year, month, day } = parseDateKey(dateKey);
  return formatDateKey(new Date(Date.UTC(year, month - 1, day + days)));
}

function differenceInCalendarDays(left: string, right: string) {
  const leftDate = parseDateKey(left);
  const rightDate = parseDateKey(right);
  const leftTime = Date.UTC(leftDate.year, leftDate.month - 1, leftDate.day);
  const rightTime = Date.UTC(rightDate.year, rightDate.month - 1, rightDate.day);
  return Math.round((leftTime - rightTime) / 86_400_000);
}

function getDayOfWeek(dateKey: string) {
  const { year, month, day } = parseDateKey(dateKey);
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

function getTimeZoneParts(timestamp: number, timeZone: string) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(new Date(timestamp));

  return Object.fromEntries(parts.map((part) => [part.type, part.value]));
}

function localDateTimeToIso(dateKey: string, time: string, timeZone: string) {
  const date = parseDateKey(dateKey);
  const timeMatch = TIME_PATTERN.exec(time);
  if (!timeMatch) {
    throw new Error(`Invalid chore time: ${time}`);
  }

  const desiredUtc = Date.UTC(
    date.year,
    date.month - 1,
    date.day,
    Number(timeMatch[1]),
    Number(timeMatch[2])
  );
  let candidate = desiredUtc;
  for (let pass = 0; pass < 2; pass += 1) {
    const parts = getTimeZoneParts(candidate, timeZone);
    const representedUtc = Date.UTC(
      Number(parts.year),
      Number(parts.month) - 1,
      Number(parts.day),
      Number(parts.hour),
      Number(parts.minute),
      Number(parts.second)
    );
    candidate += desiredUtc - representedUtc;
  }

  return new Date(candidate).toISOString();
}

function getZonedDateKey(timestamp: string, timeZone: string) {
  const parts = getTimeZoneParts(new Date(timestamp).getTime(), timeZone);
  return `${parts.year}-${parts.month}-${parts.day}`;
}

function scheduleStartDate(schedule: ChoreSchedule) {
  return schedule.frequency === 'once' ? schedule.date : schedule.startDate;
}

function definitionMaterializationChanged(current: ChoreDefinition, next: ChoreDefinition) {
  return (
    JSON.stringify(current.schedule) !== JSON.stringify(next.schedule) ||
    JSON.stringify(current.assignment) !== JSON.stringify(next.assignment) ||
    current.dueWindowMinutes !== next.dueWindowMinutes
  );
}

function canDiscardForRematerialization(occurrence: ChoreOccurrence) {
  return occurrence.status === 'available' && occurrence.carriedForwardFrom === undefined;
}

function isScheduledOnDate(
  schedule: Exclude<ChoreSchedule, { frequency: 'after_completion' }>,
  dateKey: string
) {
  const startDate = scheduleStartDate(schedule);
  if (
    dateKey < startDate ||
    (schedule.endDate !== undefined && dateKey > schedule.endDate) ||
    schedule.excludedDates?.includes(dateKey)
  ) {
    return false;
  }

  if (schedule.frequency === 'once') {
    return dateKey === schedule.date;
  }

  if (schedule.frequency === 'daily') {
    return (
      differenceInCalendarDays(dateKey, startDate) % (schedule.intervalDays ?? 1) === 0 &&
      (!schedule.daysOfWeek || schedule.daysOfWeek.includes(getDayOfWeek(dateKey)))
    );
  }

  if (schedule.frequency === 'weekly') {
    const weeksSinceStart = Math.floor(differenceInCalendarDays(dateKey, startDate) / 7);
    return (
      weeksSinceStart % (schedule.intervalWeeks ?? 1) === 0 &&
      schedule.daysOfWeek.includes(getDayOfWeek(dateKey))
    );
  }

  const { year, month, day } = parseDateKey(dateKey);
  const lastDay = getLastDayOfMonth(year, month);
  if (schedule.nthWeekday) {
    if (getDayOfWeek(dateKey) !== schedule.nthWeekday.weekday) return false;
    return schedule.nthWeekday.ordinal === -1
      ? day + 7 > lastDay
      : Math.ceil(day / 7) === schedule.nthWeekday.ordinal;
  }
  return day === Math.min(schedule.dayOfMonth ?? 1, lastDay);
}

function scheduleTimes(schedule: ChoreSchedule) {
  return schedule.times && schedule.times.length > 0 ? schedule.times : [schedule.time];
}

function scheduleGroupKey(dateKey: string, reset: ChoreAssignment['rotationReset']) {
  if (reset === 'monthly') return dateKey.slice(0, 7);
  if (reset === 'weekly') {
    const mondayOffset = (getDayOfWeek(dateKey) + 6) % 7;
    return addCalendarDays(dateKey, -mondayOffset);
  }
  return '';
}

function rotationIndexForDate(
  scheduledDates: string[],
  scheduledIndex: number,
  reset: ChoreAssignment['rotationReset']
) {
  if (!reset || reset === 'never') return scheduledIndex;
  const group = scheduleGroupKey(scheduledDates[scheduledIndex], reset);
  let firstIndex = scheduledIndex;
  while (firstIndex > 0 && scheduleGroupKey(scheduledDates[firstIndex - 1], reset) === group) {
    firstIndex -= 1;
  }
  return scheduledIndex - firstIndex;
}

function activeParticipantIds(
  assignment: ChoreAssignment,
  participantsById: Record<string, ChoreParticipant>
) {
  return assignment.participantIds.filter((participantId) => {
    const participant = participantsById[participantId];
    return participant && !participant.pausedAt && participant.capabilities.includes('complete');
  });
}

function resolveAssignmentSlots(
  assignment: ChoreAssignment,
  participantsById: Record<string, ChoreParticipant>,
  scheduledIndex: number
) {
  const participantIds = activeParticipantIds(assignment, participantsById);
  if (participantIds.length === 0) {
    return [];
  }

  if (assignment.mode === 'everyone') {
    return participantIds.map((participantId) => ({
      assignmentSlot: participantId,
      assigneeIds: [participantId],
    }));
  }

  if (assignment.mode === 'rotation') {
    const cursor = Math.max(0, assignment.rotationCursor ?? 0);
    const participantId = participantIds[(cursor + scheduledIndex) % participantIds.length];
    return [{ assignmentSlot: participantId, assigneeIds: [participantId] }];
  }

  if (assignment.mode === 'person') {
    return [{ assignmentSlot: participantIds[0], assigneeIds: [participantIds[0]] }];
  }

  return [{ assignmentSlot: 'shared', assigneeIds: participantIds }];
}

function buildOccurrenceId(definitionId: string, scheduledAt: string, assignmentSlot: string) {
  return `${definitionId}:${scheduledAt}:${assignmentSlot}`;
}

function createOccurrence(
  definition: ChoreDefinition,
  scheduledAt: string,
  assignmentSlot: string,
  assigneeIds: string[]
): ChoreOccurrence {
  return {
    id: buildOccurrenceId(definition.id, scheduledAt, assignmentSlot),
    definitionId: definition.id,
    scheduledAt,
    dueAt: new Date(
      new Date(scheduledAt).getTime() + Math.max(0, definition.dueWindowMinutes) * 60_000
    ).toISOString(),
    assigneeIds,
    assignmentSlot,
    status: 'available',
    updatedAt: scheduledAt,
  };
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isIsoTimestamp(value: unknown) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

function isChoreParticipant(value: unknown, expectedId: string) {
  if (!isRecord(value)) return false;
  const reminderPreferences = value.reminderPreferences;
  const validReminderPreferences =
    reminderPreferences === undefined ||
    (isRecord(reminderPreferences) &&
      typeof reminderPreferences.enabled === 'boolean' &&
      (reminderPreferences.quietHours === undefined ||
        (isRecord(reminderPreferences.quietHours) &&
          typeof reminderPreferences.quietHours.start === 'string' &&
          TIME_PATTERN.test(reminderPreferences.quietHours.start) &&
          typeof reminderPreferences.quietHours.end === 'string' &&
          TIME_PATTERN.test(reminderPreferences.quietHours.end) &&
          (reminderPreferences.quietHours.timeZone === undefined ||
            (typeof reminderPreferences.quietHours.timeZone === 'string' &&
              reminderPreferences.quietHours.timeZone.length > 0)))) &&
      (reminderPreferences.destination === undefined ||
        (isRecord(reminderPreferences.destination) &&
          ['in_app', 'home_assistant'].includes(String(reminderPreferences.destination.type)) &&
          (reminderPreferences.destination.target === undefined ||
            typeof reminderPreferences.destination.target === 'string'))));
  return (
    value.id === expectedId &&
    typeof value.displayName === 'string' &&
    value.displayName.trim().length > 0 &&
    isStringArray(value.capabilities) &&
    value.capabilities.every((capability) =>
      ['complete', 'approve', 'manage'].includes(capability)
    ) &&
    (value.color === undefined || typeof value.color === 'string') &&
    (value.avatarUrl === undefined || typeof value.avatarUrl === 'string') &&
    (value.avatarIcon === undefined ||
      (typeof value.avatarIcon === 'string' && value.avatarIcon.length <= 64)) &&
    (value.linkedAccountId === undefined || typeof value.linkedAccountId === 'string') &&
    (value.linkedPersonEntityId === undefined || typeof value.linkedPersonEntityId === 'string') &&
    validReminderPreferences &&
    isIsoTimestamp(value.createdAt) &&
    isIsoTimestamp(value.updatedAt) &&
    (value.pausedAt === undefined || isIsoTimestamp(value.pausedAt))
  );
}

function isChoreSchedule(value: unknown): value is ChoreSchedule {
  if (!isRecord(value) || typeof value.frequency !== 'string') return false;
  if (
    typeof value.time !== 'string' ||
    !TIME_PATTERN.test(value.time) ||
    typeof value.timeZone !== 'string' ||
    value.timeZone.length === 0
  ) {
    return false;
  }
  if (
    (value.endDate !== undefined &&
      (typeof value.endDate !== 'string' || !DATE_PATTERN.test(value.endDate))) ||
    (value.excludedDates !== undefined &&
      (!Array.isArray(value.excludedDates) ||
        !value.excludedDates.every(
          (date) => typeof date === 'string' && DATE_PATTERN.test(date)
        ))) ||
    (value.times !== undefined &&
      (!Array.isArray(value.times) ||
        value.times.length === 0 ||
        !value.times.every((time) => typeof time === 'string' && TIME_PATTERN.test(time))))
  ) {
    return false;
  }
  if (value.frequency === 'once') {
    return typeof value.date === 'string' && DATE_PATTERN.test(value.date);
  }
  if (typeof value.startDate !== 'string' || !DATE_PATTERN.test(value.startDate)) return false;
  if (value.frequency === 'daily') {
    return (
      (value.daysOfWeek === undefined ||
        (Array.isArray(value.daysOfWeek) &&
          value.daysOfWeek.every(
            (day) => Number.isSafeInteger(day) && Number(day) >= 0 && Number(day) <= 6
          ))) &&
      (value.intervalDays === undefined ||
        (Number.isSafeInteger(value.intervalDays) && Number(value.intervalDays) > 0))
    );
  }
  if (value.frequency === 'weekly') {
    return (
      Array.isArray(value.daysOfWeek) &&
      value.daysOfWeek.length > 0 &&
      value.daysOfWeek.every(
        (day) => Number.isSafeInteger(day) && Number(day) >= 0 && Number(day) <= 6
      ) &&
      (value.intervalWeeks === undefined ||
        (Number.isSafeInteger(value.intervalWeeks) && Number(value.intervalWeeks) > 0))
    );
  }
  if (value.frequency === 'monthly') {
    const validDayOfMonth =
      value.dayOfMonth !== undefined &&
      Number.isSafeInteger(value.dayOfMonth) &&
      Number(value.dayOfMonth) >= 1 &&
      Number(value.dayOfMonth) <= 31;
    const validNthWeekday =
      isRecord(value.nthWeekday) &&
      Number.isSafeInteger(value.nthWeekday.weekday) &&
      Number(value.nthWeekday.weekday) >= 0 &&
      Number(value.nthWeekday.weekday) <= 6 &&
      [1, 2, 3, 4, 5, -1].includes(Number(value.nthWeekday.ordinal));
    return validDayOfMonth || validNthWeekday;
  }
  if (value.frequency === 'after_completion') {
    return Number.isSafeInteger(value.intervalDays) && Number(value.intervalDays) > 0;
  }
  return false;
}

function isChoreDefinition(value: unknown, expectedId: string) {
  if (!isRecord(value) || !isRecord(value.assignment) || !isRecord(value.approval)) return false;
  return (
    value.id === expectedId &&
    typeof value.title === 'string' &&
    value.title.trim().length > 0 &&
    (value.description === undefined || typeof value.description === 'string') &&
    (value.icon === undefined || typeof value.icon === 'string') &&
    (value.roomRef === undefined ||
      (isRecord(value.roomRef) &&
        typeof value.roomRef.canonicalId === 'string' &&
        typeof value.roomRef.label === 'string')) &&
    typeof value.enabled === 'boolean' &&
    ['person', 'anyone', 'everyone', 'rotation'].includes(String(value.assignment.mode)) &&
    isStringArray(value.assignment.participantIds) &&
    (value.assignment.rotationCursor === undefined ||
      (Number.isSafeInteger(value.assignment.rotationCursor) &&
        Number(value.assignment.rotationCursor) >= 0)) &&
    (value.assignment.rotationReset === undefined ||
      ['never', 'weekly', 'monthly'].includes(String(value.assignment.rotationReset))) &&
    (value.assignment.participantScheduleOverrides === undefined ||
      (isRecord(value.assignment.participantScheduleOverrides) &&
        Object.values(value.assignment.participantScheduleOverrides).every(
          (override) =>
            isRecord(override) &&
            (override.daysOfWeek === undefined ||
              (Array.isArray(override.daysOfWeek) &&
                override.daysOfWeek.every(
                  (day) => Number.isSafeInteger(day) && Number(day) >= 0 && Number(day) <= 6
                ))) &&
            (override.times === undefined ||
              (Array.isArray(override.times) &&
                override.times.length > 0 &&
                override.times.every(
                  (time) => typeof time === 'string' && TIME_PATTERN.test(time)
                )))
        ))) &&
    isChoreSchedule(value.schedule) &&
    Number.isFinite(value.dueWindowMinutes) &&
    Number(value.dueWindowMinutes) >= 0 &&
    typeof value.approval.required === 'boolean' &&
    isStringArray(value.approval.approverIds) &&
    (value.claimPolicy === undefined ||
      (isRecord(value.claimPolicy) &&
        typeof value.claimPolicy.required === 'boolean' &&
        typeof value.claimPolicy.allowSteal === 'boolean' &&
        (value.claimPolicy.expiresAfterMinutes === undefined ||
          (Number.isSafeInteger(value.claimPolicy.expiresAfterMinutes) &&
            Number(value.claimPolicy.expiresAfterMinutes) > 0)))) &&
    (value.missedPolicy === undefined ||
      (isRecord(value.missedPolicy) &&
        Number.isSafeInteger(value.missedPolicy.graceMinutes) &&
        Number(value.missedPolicy.graceMinutes) >= 0 &&
        ['none', 'skip', 'carry_forward'].includes(String(value.missedPolicy.action)) &&
        (value.missedPolicy.carryForwardDays === undefined ||
          (Number.isSafeInteger(value.missedPolicy.carryForwardDays) &&
            Number(value.missedPolicy.carryForwardDays) > 0)))) &&
    (value.reminderPolicy === undefined ||
      (isRecord(value.reminderPolicy) &&
        typeof value.reminderPolicy.enabled === 'boolean' &&
        Array.isArray(value.reminderPolicy.beforeDueMinutes) &&
        value.reminderPolicy.beforeDueMinutes.every(
          (minutes) => Number.isSafeInteger(minutes) && Number(minutes) > 0
        ) &&
        typeof value.reminderPolicy.atDue === 'boolean' &&
        (value.reminderPolicy.overdueEveryMinutes === undefined ||
          (Number.isSafeInteger(value.reminderPolicy.overdueEveryMinutes) &&
            Number(value.reminderPolicy.overdueEveryMinutes) > 0)) &&
        (value.reminderPolicy.maxOverdueReminders === undefined ||
          (Number.isSafeInteger(value.reminderPolicy.maxOverdueReminders) &&
            Number(value.reminderPolicy.maxOverdueReminders) > 0)) &&
        (value.reminderPolicy.approvalAfterMinutes === undefined ||
          (Number.isSafeInteger(value.reminderPolicy.approvalAfterMinutes) &&
            Number(value.reminderPolicy.approvalAfterMinutes) >= 0)))) &&
    isIsoTimestamp(value.createdAt) &&
    isIsoTimestamp(value.updatedAt) &&
    (value.archivedAt === undefined || isIsoTimestamp(value.archivedAt))
  );
}

function isChoreOccurrence(value: unknown, expectedId: string) {
  if (!isRecord(value)) return false;
  return (
    value.id === expectedId &&
    typeof value.definitionId === 'string' &&
    isIsoTimestamp(value.scheduledAt) &&
    isIsoTimestamp(value.dueAt) &&
    isStringArray(value.assigneeIds) &&
    typeof value.assignmentSlot === 'string' &&
    ['available', 'claimed', 'awaiting_approval', 'done', 'skipped', 'missed'].includes(
      String(value.status)
    ) &&
    (value.claimedBy === undefined || typeof value.claimedBy === 'string') &&
    (value.claimedAt === undefined || isIsoTimestamp(value.claimedAt)) &&
    (value.completedBy === undefined || typeof value.completedBy === 'string') &&
    (value.completedAt === undefined || isIsoTimestamp(value.completedAt)) &&
    (value.approvedBy === undefined || typeof value.approvedBy === 'string') &&
    (value.approvedAt === undefined || isIsoTimestamp(value.approvedAt)) &&
    (value.skippedBy === undefined || typeof value.skippedBy === 'string') &&
    (value.skippedAt === undefined || isIsoTimestamp(value.skippedAt)) &&
    (value.missedAt === undefined || isIsoTimestamp(value.missedAt)) &&
    (value.carriedForwardTo === undefined || typeof value.carriedForwardTo === 'string') &&
    (value.carriedForwardFrom === undefined || typeof value.carriedForwardFrom === 'string') &&
    isIsoTimestamp(value.updatedAt)
  );
}

function isChoreActivity(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    typeof value.commandId === 'string' &&
    value.commandId.length > 0 &&
    [
      'participant_created',
      'participant_updated',
      'definition_created',
      'definition_updated',
      'definition_archived',
      'workspace_materialized',
      'workspace_imported',
      'workspace_reset',
      'retention_updated',
      'experience_updated',
      'points_adjusted',
      'occurrence_created',
      'due',
      'overdue',
      'claimed',
      'completed',
      'approved',
      'rejected',
      'skipped',
      'reopened',
      'reassigned',
      'missed',
      'reminder_acknowledged',
      'outbox_delivery_updated',
    ].includes(String(value.type)) &&
    isIsoTimestamp(value.timestamp) &&
    (value.occurrenceId === undefined || typeof value.occurrenceId === 'string') &&
    (value.definitionId === undefined || typeof value.definitionId === 'string') &&
    (value.participantId === undefined || typeof value.participantId === 'string') &&
    (value.actorParticipantId === undefined || typeof value.actorParticipantId === 'string') &&
    (value.reason === undefined || typeof value.reason === 'string') &&
    (value.pointsDelta === undefined ||
      (Number.isSafeInteger(value.pointsDelta) && Math.abs(Number(value.pointsDelta)) <= 10_000)) &&
    (value.previousAssigneeIds === undefined ||
      (Array.isArray(value.previousAssigneeIds) &&
        value.previousAssigneeIds.every((id) => typeof id === 'string'))) &&
    (value.assigneeIds === undefined ||
      (Array.isArray(value.assigneeIds) &&
        value.assigneeIds.every((id) => typeof id === 'string'))) &&
    (value.outboxId === undefined || typeof value.outboxId === 'string')
  );
}

function isChoreOutboxItem(value: unknown) {
  if (!isRecord(value)) return false;
  return (
    typeof value.id === 'string' &&
    value.id.length > 0 &&
    typeof value.activityId === 'string' &&
    value.activityId.length > 0 &&
    [
      'participant_created',
      'participant_updated',
      'definition_created',
      'definition_updated',
      'definition_archived',
      'workspace_materialized',
      'workspace_imported',
      'workspace_reset',
      'retention_updated',
      'experience_updated',
      'points_adjusted',
      'occurrence_created',
      'due',
      'overdue',
      'claimed',
      'completed',
      'approved',
      'rejected',
      'skipped',
      'reopened',
      'reassigned',
      'missed',
      'reminder_acknowledged',
      'outbox_delivery_updated',
      'reminder_before_due',
      'reminder_due',
      'reminder_overdue',
      'reminder_approval',
    ].includes(String(value.eventType)) &&
    ['pending', 'delivered', 'failed'].includes(String(value.status)) &&
    Number.isSafeInteger(value.attempts) &&
    Number(value.attempts) >= 0 &&
    isIsoTimestamp(value.createdAt) &&
    isIsoTimestamp(value.nextAttemptAt) &&
    (value.lastAttemptAt === undefined || isIsoTimestamp(value.lastAttemptAt)) &&
    (value.deliveredAt === undefined || isIsoTimestamp(value.deliveredAt)) &&
    (value.lastError === undefined || typeof value.lastError === 'string') &&
    (value.occurrenceId === undefined || typeof value.occurrenceId === 'string') &&
    (value.participantId === undefined || typeof value.participantId === 'string') &&
    (value.destination === undefined ||
      ['in_app', 'home_assistant'].includes(String(value.destination))) &&
    (value.destinationTarget === undefined || typeof value.destinationTarget === 'string')
  );
}

function hasValidChoreWorkspaceCollections(value: Record<string, unknown>) {
  if (
    !isRecord(value.participantsById) ||
    !isRecord(value.definitionsById) ||
    !isRecord(value.occurrencesById) ||
    !Array.isArray(value.activity)
  ) {
    return false;
  }

  return (
    Object.entries(value.participantsById).every(([id, participant]) =>
      isChoreParticipant(participant, id)
    ) &&
    Object.entries(value.definitionsById).every(([id, definition]) =>
      isChoreDefinition(definition, id)
    ) &&
    Object.entries(value.occurrencesById).every(([id, occurrence]) =>
      isChoreOccurrence(occurrence, id)
    ) &&
    value.activity.every(isChoreActivity)
  );
}

export function createEmptyChoreWorkspace(): ChoreWorkspaceData {
  return {
    schemaVersion: CHORE_WORKSPACE_SCHEMA_VERSION,
    participantsById: {},
    definitionsById: {},
    occurrencesById: {},
    activity: [],
    outbox: [],
    historyRetention: { ...DEFAULT_CHORE_HISTORY_RETENTION },
    experience: createChoreExperienceState(),
  };
}

export function isChoreWorkspaceData(value: unknown): value is ChoreWorkspaceData {
  return (
    isRecord(value) &&
    value.schemaVersion === CHORE_WORKSPACE_SCHEMA_VERSION &&
    hasValidChoreWorkspaceCollections(value) &&
    Array.isArray(value.outbox) &&
    value.outbox.every(isChoreOutboxItem) &&
    (value.historyRetention === undefined ||
      isChoreHistoryRetentionPolicy(value.historyRetention)) &&
    (value.experience === undefined || isChoreExperienceState(value.experience))
  );
}

export function migrateChoreWorkspaceData(value: unknown): ChoreWorkspaceData {
  if (isChoreWorkspaceData(value)) {
    return value.experience ? value : { ...value, experience: createChoreExperienceState() };
  }

  if (isRecord(value) && value.schemaVersion === 1 && hasValidChoreWorkspaceCollections(value)) {
    const migrated: ChoreWorkspaceData = {
      schemaVersion: CHORE_WORKSPACE_SCHEMA_VERSION,
      participantsById: value.participantsById as Record<string, ChoreParticipant>,
      definitionsById: value.definitionsById as Record<string, ChoreDefinition>,
      occurrencesById: value.occurrencesById as Record<string, ChoreOccurrence>,
      activity: value.activity as ChoreActivity[],
      outbox: [],
      historyRetention: { ...DEFAULT_CHORE_HISTORY_RETENTION },
      experience: createChoreExperienceState(),
    };
    return migrated;
  }

  throw new Error('Unsupported or invalid chore workspace schema');
}

export function isChoreHistoryRetentionPolicy(
  value: unknown
): value is ChoreHistoryRetentionPolicy {
  return (
    isRecord(value) &&
    Number.isSafeInteger(value.maxAgeDays) &&
    Number(value.maxAgeDays) >= 30 &&
    Number(value.maxAgeDays) <= 3650 &&
    Number.isSafeInteger(value.maxEvents) &&
    Number(value.maxEvents) >= 1000 &&
    Number(value.maxEvents) <= 100_000
  );
}

export function createChoreOutboxItem(activity: ChoreActivity): ChoreOutboxItem {
  return {
    id: `outbox:${activity.id}`,
    activityId: activity.id,
    eventType: activity.type,
    status: 'pending',
    attempts: 0,
    createdAt: activity.timestamp,
    nextAttemptAt: activity.timestamp,
  };
}

export function getChoreTiming(occurrence: ChoreOccurrence, now = new Date()): ChoreTiming {
  const nowTime = now.getTime();
  if (nowTime < new Date(occurrence.scheduledAt).getTime()) {
    return 'upcoming';
  }
  if (nowTime > new Date(occurrence.dueAt).getTime() && occurrence.status !== 'done') {
    return 'overdue';
  }
  return 'due';
}

export function materializeChoreOccurrences({
  definition,
  participantsById,
  rangeStart,
  rangeEnd,
  existingOccurrences = {},
  latestCompletedAt,
}: MaterializeChoreOccurrencesInput): ChoreOccurrence[] {
  if (!definition.enabled || definition.archivedAt) {
    return [];
  }

  const rangeStartTime = new Date(rangeStart).getTime();
  const rangeEndTime = new Date(rangeEnd).getTime();
  if (
    !Number.isFinite(rangeStartTime) ||
    !Number.isFinite(rangeEndTime) ||
    rangeEndTime < rangeStartTime
  ) {
    throw new Error('Invalid chore occurrence range');
  }

  const schedule = definition.schedule;
  const rangeStartDateKey = getZonedDateKey(rangeStart, schedule.timeZone);
  let dateKey = scheduleStartDate(schedule);
  const finalDateKey = getZonedDateKey(rangeEnd, schedule.timeZone);
  const scheduledDates: string[] = [];

  if (schedule.frequency === 'after_completion') {
    const anchor = latestCompletedAt
      ? getZonedDateKey(latestCompletedAt, schedule.timeZone)
      : schedule.startDate;
    const nextDate = latestCompletedAt ? addCalendarDays(anchor, schedule.intervalDays) : anchor;
    if (
      nextDate >= rangeStartDateKey &&
      nextDate <= finalDateKey &&
      (schedule.endDate === undefined || nextDate <= schedule.endDate) &&
      !schedule.excludedDates?.includes(nextDate)
    ) {
      scheduledDates.push(nextDate);
    }
  } else {
    while (dateKey <= finalDateKey) {
      if (isScheduledOnDate(schedule, dateKey)) {
        scheduledDates.push(dateKey);
      }
      dateKey = addCalendarDays(dateKey, 1);
    }
  }

  const occurrences: ChoreOccurrence[] = [];
  for (const [scheduledIndex, scheduledDate] of scheduledDates.entries()) {
    const rotationIndex = rotationIndexForDate(
      scheduledDates,
      scheduledIndex,
      definition.assignment.rotationReset
    );
    const slots = resolveAssignmentSlots(definition.assignment, participantsById, rotationIndex);
    for (const slot of slots) {
      const override =
        slot.assigneeIds.length === 1
          ? definition.assignment.participantScheduleOverrides?.[slot.assigneeIds[0]]
          : undefined;
      if (override?.daysOfWeek && !override.daysOfWeek.includes(getDayOfWeek(scheduledDate))) {
        continue;
      }
      for (const scheduledTimeValue of override?.times ?? scheduleTimes(schedule)) {
        const scheduledAt = localDateTimeToIso(
          scheduledDate,
          scheduledTimeValue,
          schedule.timeZone
        );
        const scheduledTime = new Date(scheduledAt).getTime();
        if (scheduledTime < rangeStartTime || scheduledTime > rangeEndTime) continue;
        const id = buildOccurrenceId(definition.id, scheduledAt, slot.assignmentSlot);
        occurrences.push(
          existingOccurrences[id] ??
            createOccurrence(definition, scheduledAt, slot.assignmentSlot, slot.assigneeIds)
        );
      }
    }
  }

  return occurrences;
}

function timeToMinutes(value: string) {
  const match = TIME_PATTERN.exec(value);
  if (!match) throw new Error(`Invalid chore time: ${value}`);
  return Number(match[1]) * 60 + Number(match[2]);
}

function nextReminderDeliveryAt(
  timestamp: string,
  participant: ChoreParticipant,
  fallbackTimeZone: string
) {
  const quietHours = participant.reminderPreferences?.quietHours;
  if (!quietHours || quietHours.start === quietHours.end) return timestamp;
  const timeZone = quietHours.timeZone ?? fallbackTimeZone;
  const parts = getTimeZoneParts(Date.parse(timestamp), timeZone);
  const localMinutes = Number(parts.hour) * 60 + Number(parts.minute);
  const startMinutes = timeToMinutes(quietHours.start);
  const endMinutes = timeToMinutes(quietHours.end);
  const crossesMidnight = startMinutes > endMinutes;
  const insideQuietHours = crossesMidnight
    ? localMinutes >= startMinutes || localMinutes < endMinutes
    : localMinutes >= startMinutes && localMinutes < endMinutes;
  if (!insideQuietHours) return timestamp;

  let quietEndDate = `${parts.year}-${parts.month}-${parts.day}`;
  if (crossesMidnight && localMinutes >= startMinutes) {
    quietEndDate = addCalendarDays(quietEndDate, 1);
  }
  return localDateTimeToIso(quietEndDate, quietHours.end, timeZone);
}

function createReminderOutboxItem(input: {
  definition: ChoreDefinition;
  occurrence: ChoreOccurrence;
  participant: ChoreParticipant;
  eventType: ChoreReminderEventType;
  eventKey: string;
  timestamp: string;
}): ChoreOutboxItem {
  const id = `outbox:reminder:${input.eventKey}:${input.participant.id}`;
  const destination = input.participant.reminderPreferences?.destination;
  return {
    id,
    activityId: `scheduler:${input.eventKey}`,
    eventType: input.eventType,
    status: 'pending',
    attempts: 0,
    createdAt: input.timestamp,
    nextAttemptAt: nextReminderDeliveryAt(
      input.timestamp,
      input.participant,
      input.definition.schedule.timeZone
    ),
    occurrenceId: input.occurrence.id,
    participantId: input.participant.id,
    destination: destination?.type ?? 'in_app',
    destinationTarget: destination?.target,
  };
}

export function runChoreWorkspaceScheduler(
  workspace: ChoreWorkspaceData,
  timestamp = new Date().toISOString(),
  options: RunChoreWorkspaceSchedulerOptions = {}
): RunChoreWorkspaceSchedulerResult {
  const now = Date.parse(timestamp);
  if (!Number.isFinite(now)) throw new Error('Invalid chore scheduler timestamp');
  const occurrencesById = { ...workspace.occurrencesById };
  const activities: ChoreActivity[] = [];
  const outboxItems: ChoreOutboxItem[] = [];
  const existingOutboxIds = new Set(workspace.outbox.map((item) => item.id));
  const existingEventIds = new Set([
    ...workspace.activity.map((activity) => activity.id),
    ...(options.existingEventIds ?? []),
  ]);

  const addLifecycleEvent = (
    occurrence: ChoreOccurrence,
    type: Extract<ChoreActivityType, 'due' | 'overdue'>,
    eventTimestamp: string
  ) => {
    const id = `activity:scheduler:${type}:${occurrence.id}`;
    if (existingEventIds.has(id)) return;
    existingEventIds.add(id);
    activities.push({
      id,
      commandId: `scheduler:${type}:${occurrence.id}`,
      occurrenceId: occurrence.id,
      definitionId: occurrence.definitionId,
      assigneeIds: occurrence.assigneeIds,
      type,
      timestamp: eventTimestamp,
    });
  };

  for (const occurrence of Object.values(workspace.occurrencesById)) {
    const dueAt = Date.parse(occurrence.dueAt);
    if (!Number.isFinite(dueAt) || now < dueAt) continue;
    addLifecycleEvent(occurrence, 'due', occurrence.dueAt);
    const resolvedAt = occurrence.completedAt ?? occurrence.skippedAt ?? occurrence.missedAt;
    if (now > dueAt && (!resolvedAt || Date.parse(resolvedAt) > dueAt)) {
      addLifecycleEvent(occurrence, 'overdue', occurrence.dueAt);
    }
  }

  for (const occurrence of Object.values(workspace.occurrencesById)) {
    if (occurrence.status !== 'available' && occurrence.status !== 'claimed') continue;
    const definition = workspace.definitionsById[occurrence.definitionId];
    const policy = definition?.missedPolicy;
    if (!definition || !policy) continue;
    const missedBoundary = Date.parse(occurrence.dueAt) + policy.graceMinutes * 60_000;
    if (!Number.isFinite(missedBoundary) || now < missedBoundary) continue;

    const activity: ChoreActivity = {
      id: `activity:scheduler:missed:${occurrence.id}:${missedBoundary}`,
      commandId: `scheduler:missed:${occurrence.id}:${missedBoundary}`,
      occurrenceId: occurrence.id,
      definitionId: definition.id,
      type: policy.action === 'skip' ? 'skipped' : 'missed',
      reason: 'Missed-work policy',
      timestamp,
    };
    const nextOccurrence: ChoreOccurrence = {
      ...occurrence,
      status: policy.action === 'skip' ? 'skipped' : 'missed',
      skippedAt: policy.action === 'skip' ? timestamp : occurrence.skippedAt,
      missedAt: policy.action === 'skip' ? occurrence.missedAt : timestamp,
      updatedAt: timestamp,
    };
    activities.push(activity);

    if (policy.action === 'carry_forward') {
      const carryDays = policy.carryForwardDays ?? 1;
      const scheduledAt = new Date(Date.parse(occurrence.scheduledAt) + carryDays * 86_400_000);
      const dueAt = new Date(Date.parse(occurrence.dueAt) + carryDays * 86_400_000);
      const assignmentSlot = `carry:${occurrence.id}`;
      const carriedOccurrence: ChoreOccurrence = {
        id: buildOccurrenceId(definition.id, scheduledAt.toISOString(), assignmentSlot),
        definitionId: definition.id,
        scheduledAt: scheduledAt.toISOString(),
        dueAt: dueAt.toISOString(),
        assigneeIds: occurrence.assigneeIds,
        assignmentSlot,
        status: 'available',
        carriedForwardFrom: occurrence.id,
        updatedAt: timestamp,
      };
      nextOccurrence.carriedForwardTo = carriedOccurrence.id;
      occurrencesById[carriedOccurrence.id] ??= carriedOccurrence;
      activities.push({
        id: `activity:scheduler:created:${carriedOccurrence.id}`,
        commandId: `scheduler:created:${carriedOccurrence.id}`,
        occurrenceId: carriedOccurrence.id,
        definitionId: definition.id,
        type: 'occurrence_created',
        assigneeIds: carriedOccurrence.assigneeIds,
        reason: 'Carried forward from missed chore',
        timestamp,
      });
    }

    occurrencesById[occurrence.id] = nextOccurrence;
  }

  const addReminder = (
    definition: ChoreDefinition,
    occurrence: ChoreOccurrence,
    participantId: string,
    eventType: ChoreReminderEventType,
    eventKey: string
  ) => {
    const participant = workspace.participantsById[participantId];
    if (
      !participant ||
      participant.pausedAt ||
      participant.reminderPreferences?.enabled === false
    ) {
      return;
    }
    const item = createReminderOutboxItem({
      definition,
      occurrence,
      participant,
      eventType,
      eventKey,
      timestamp,
    });
    if (existingOutboxIds.has(item.id)) return;
    existingOutboxIds.add(item.id);
    outboxItems.push(item);
  };

  for (const occurrence of Object.values(occurrencesById)) {
    const definition = workspace.definitionsById[occurrence.definitionId];
    const policy = definition?.reminderPolicy;
    if (!definition || !policy?.enabled || definition.archivedAt) continue;

    if (occurrence.status === 'available' || occurrence.status === 'claimed') {
      const dueAt = Date.parse(occurrence.dueAt);
      for (const beforeDueMinutes of [...new Set(policy.beforeDueMinutes)]) {
        if (now < dueAt - beforeDueMinutes * 60_000 || now >= dueAt) continue;
        for (const participantId of occurrence.assigneeIds) {
          addReminder(
            definition,
            occurrence,
            participantId,
            'reminder_before_due',
            `before:${occurrence.id}:${beforeDueMinutes}`
          );
        }
      }
      if (policy.atDue && now >= dueAt) {
        for (const participantId of occurrence.assigneeIds) {
          addReminder(
            definition,
            occurrence,
            participantId,
            'reminder_due',
            `due:${occurrence.id}`
          );
        }
      }
      if (policy.overdueEveryMinutes && now >= dueAt + policy.overdueEveryMinutes * 60_000) {
        const elapsedSlots = Math.floor((now - dueAt) / (policy.overdueEveryMinutes * 60_000));
        const slotCount = Math.min(elapsedSlots, policy.maxOverdueReminders ?? elapsedSlots);
        for (let slot = 1; slot <= slotCount; slot += 1) {
          for (const participantId of occurrence.assigneeIds) {
            addReminder(
              definition,
              occurrence,
              participantId,
              'reminder_overdue',
              `overdue:${occurrence.id}:${slot}`
            );
          }
        }
      }
    }

    if (
      occurrence.status === 'awaiting_approval' &&
      occurrence.completedAt &&
      policy.approvalAfterMinutes !== undefined &&
      now >= Date.parse(occurrence.completedAt) + policy.approvalAfterMinutes * 60_000
    ) {
      for (const participantId of definition.approval.approverIds) {
        addReminder(
          definition,
          occurrence,
          participantId,
          'reminder_approval',
          `approval:${occurrence.id}`
        );
      }
    }
  }

  return {
    activities,
    outboxItems,
    data: activities.length === 0 ? workspace : { ...workspace, occurrencesById },
  };
}

function assertAssigned(occurrence: ChoreOccurrence, participantId: string) {
  if (!occurrence.assigneeIds.includes(participantId)) {
    throw new Error('Participant is not assigned to this chore occurrence');
  }
}

function buildActivity(input: ApplyChoreCommandInput, type: ChoreActivityType): ChoreActivity {
  const reason =
    'reason' in input.command && typeof input.command.reason === 'string'
      ? input.command.reason.trim()
      : undefined;
  return {
    id: `activity:${input.commandId}`,
    commandId: input.commandId,
    occurrenceId: input.occurrence.id,
    definitionId: input.definition.id,
    type,
    actorParticipantId: input.command.participantId,
    participantId: input.command.participantId,
    reason: reason || undefined,
    previousAssigneeIds:
      input.command.type === 'reassign' ? input.occurrence.assigneeIds : undefined,
    assigneeIds: input.command.type === 'reassign' ? input.command.assigneeIds : undefined,
    timestamp: input.timestamp,
  };
}

export function applyChoreOccurrenceCommand(
  input: ApplyChoreCommandInput
): ApplyChoreCommandResult {
  const { command, definition, occurrence, timestamp } = input;
  const participantId = command.participantId;
  let nextOccurrence: ChoreOccurrence;

  switch (command.type) {
    case 'claim': {
      assertAssigned(occurrence, participantId);
      const canStealExpiredClaim =
        occurrence.status === 'claimed' &&
        definition.claimPolicy?.allowSteal === true &&
        definition.claimPolicy.expiresAfterMinutes !== undefined &&
        occurrence.claimedAt !== undefined &&
        Date.parse(timestamp) >=
          Date.parse(occurrence.claimedAt) + definition.claimPolicy.expiresAfterMinutes * 60_000;
      if (occurrence.status !== 'available' && !canStealExpiredClaim) {
        throw new Error('Only available chores can be claimed');
      }
      nextOccurrence = {
        ...occurrence,
        status: 'claimed',
        claimedBy: participantId,
        claimedAt: timestamp,
        updatedAt: timestamp,
      };
      break;
    }
    case 'complete': {
      assertAssigned(occurrence, participantId);
      if (
        occurrence.status !== 'available' &&
        occurrence.status !== 'claimed' &&
        occurrence.status !== 'missed'
      ) {
        throw new Error('Only available, claimed, or missed chores can be completed');
      }
      if (
        (occurrence.status === 'claimed' || occurrence.status === 'missed') &&
        occurrence.claimedBy &&
        occurrence.claimedBy !== participantId
      ) {
        throw new Error('A claimed chore can only be completed by its claimant');
      }
      if (occurrence.status === 'available' && definition.claimPolicy?.required) {
        throw new Error('This chore must be claimed before it can be completed');
      }
      nextOccurrence = {
        ...occurrence,
        status: definition.approval.required ? 'awaiting_approval' : 'done',
        claimedBy: occurrence.claimedBy ?? participantId,
        claimedAt: occurrence.claimedAt ?? timestamp,
        completedBy: participantId,
        completedAt: timestamp,
        missedAt: undefined,
        updatedAt: timestamp,
      };
      break;
    }
    case 'approve': {
      const managerOverride = command.managerOverride === true;
      if (
        !definition.approval.required ||
        (!definition.approval.approverIds.includes(participantId) && !managerOverride)
      ) {
        throw new Error('Participant cannot approve this chore');
      }
      if (managerOverride && !command.reason?.trim()) {
        throw new Error('A manager approval override requires a reason');
      }
      if (occurrence.status !== 'awaiting_approval') {
        throw new Error('Only completed chores awaiting approval can be approved');
      }
      nextOccurrence = {
        ...occurrence,
        status: 'done',
        approvedBy: participantId,
        approvedAt: timestamp,
        updatedAt: timestamp,
      };
      break;
    }
    case 'reject': {
      const managerOverride = command.managerOverride === true;
      if (
        !definition.approval.required ||
        (!definition.approval.approverIds.includes(participantId) && !managerOverride)
      ) {
        throw new Error('Participant cannot reject this chore');
      }
      if (managerOverride && !command.reason?.trim()) {
        throw new Error('A manager rejection override requires a reason');
      }
      if (occurrence.status !== 'awaiting_approval') {
        throw new Error('Only completed chores awaiting approval can be rejected');
      }
      nextOccurrence = {
        ...occurrence,
        status: 'available',
        claimedBy: undefined,
        claimedAt: undefined,
        completedBy: undefined,
        completedAt: undefined,
        approvedBy: undefined,
        approvedAt: undefined,
        updatedAt: timestamp,
      };
      break;
    }
    case 'skip': {
      if (!command.reason.trim()) throw new Error('Skipping a chore requires a reason');
      if (occurrence.status === 'done' || occurrence.status === 'skipped') {
        throw new Error('Completed or skipped chores cannot be skipped');
      }
      nextOccurrence = {
        ...occurrence,
        status: 'skipped',
        skippedBy: participantId,
        skippedAt: timestamp,
        updatedAt: timestamp,
      };
      break;
    }
    case 'reopen': {
      if (!command.reason.trim()) throw new Error('Reopening a chore requires a reason');
      if (
        occurrence.status !== 'done' &&
        occurrence.status !== 'skipped' &&
        occurrence.status !== 'missed'
      ) {
        throw new Error('Only completed, skipped, or missed chores can be reopened');
      }
      nextOccurrence = {
        ...occurrence,
        status: 'available',
        claimedBy: undefined,
        claimedAt: undefined,
        completedBy: undefined,
        completedAt: undefined,
        approvedBy: undefined,
        approvedAt: undefined,
        skippedBy: undefined,
        skippedAt: undefined,
        missedAt: undefined,
        carriedForwardTo: undefined,
        updatedAt: timestamp,
      };
      break;
    }
    case 'reassign': {
      if (!command.reason.trim()) throw new Error('Reassigning a chore requires a reason');
      const assigneeIds = [...new Set(command.assigneeIds)];
      if (assigneeIds.length === 0) {
        throw new Error('Reassigning a chore requires an eligible participant');
      }
      if (occurrence.status !== 'available' && occurrence.status !== 'claimed') {
        throw new Error('Only available or claimed chores can be reassigned');
      }
      nextOccurrence = {
        ...occurrence,
        assigneeIds,
        assignmentSlot: `manager:${[...assigneeIds].sort().join(',')}`,
        status: 'available',
        claimedBy: undefined,
        claimedAt: undefined,
        updatedAt: timestamp,
      };
      break;
    }
  }

  const activityType: Record<ChoreOccurrenceCommand['type'], ChoreActivityType> = {
    claim: 'claimed',
    complete: 'completed',
    approve: 'approved',
    reject: 'rejected',
    skip: 'skipped',
    reopen: 'reopened',
    reassign: 'reassigned',
  };

  return {
    occurrence: nextOccurrence,
    activity: buildActivity(input, activityType[command.type]),
  };
}

function requiredCapabilityForCommand(command: ChoreOccurrenceCommand): ChoreParticipantCapability {
  if (command.type === 'approve' || command.type === 'reject') {
    return command.managerOverride ? 'manage' : 'approve';
  }
  if (command.type === 'skip' || command.type === 'reopen' || command.type === 'reassign') {
    return 'manage';
  }
  return 'complete';
}

/**
 * Applies an occurrence action through the complete workspace boundary.
 *
 * This is the preferred entry point for app and automation controls because it verifies that the
 * referenced occurrence, definition, and active household participant still exist before applying
 * the occurrence state machine. The returned activity is intentionally not appended here so the
 * persistence owner can enforce its own retention and exactly-once policy.
 */
export function applyChoreWorkspaceOccurrenceCommand(
  input: ApplyChoreWorkspaceOccurrenceCommandInput
): ApplyChoreWorkspaceOccurrenceCommandResult {
  const occurrence = input.workspace.occurrencesById[input.occurrenceId];
  if (!occurrence) throw new Error('Chore occurrence is no longer available');

  const definition = input.workspace.definitionsById[occurrence.definitionId];
  if (!definition || definition.archivedAt) {
    throw new Error('Chore definition is no longer available');
  }

  const participant = input.workspace.participantsById[input.command.participantId];
  if (!participant || participant.pausedAt) {
    throw new Error('Chore participant is not active');
  }

  const requiredCapability = requiredCapabilityForCommand(input.command);
  if (!participant.capabilities.includes(requiredCapability)) {
    throw new Error(`Chore participant cannot ${input.command.type} chores`);
  }

  if (input.command.type === 'reassign') {
    for (const assigneeId of [...new Set(input.command.assigneeIds)]) {
      const assignee = input.workspace.participantsById[assigneeId];
      if (!assignee || assignee.pausedAt || !assignee.capabilities.includes('complete')) {
        throw new Error('Chore reassignment includes an ineligible participant');
      }
    }
  }

  const result = applyChoreOccurrenceCommand({
    commandId: input.commandId,
    command: input.command,
    definition,
    occurrence,
    timestamp: input.timestamp,
  });

  return {
    activity: result.activity,
    occurrence: result.occurrence,
    data: {
      ...input.workspace,
      occurrencesById: {
        ...input.workspace.occurrencesById,
        [result.occurrence.id]: result.occurrence,
      },
    },
  };
}

function buildWorkspaceActivity(input: {
  commandId: string;
  timestamp: string;
  type: ChoreActivityType;
  actorParticipantId?: string;
  participantId?: string;
  definitionId?: string;
  reason?: string;
  pointsDelta?: number;
}): ChoreActivity {
  return {
    id: `activity:${input.commandId}`,
    commandId: input.commandId,
    timestamp: input.timestamp,
    type: input.type,
    actorParticipantId: input.actorParticipantId,
    participantId: input.participantId,
    definitionId: input.definitionId,
    reason: input.reason,
    pointsDelta: input.pointsDelta,
  };
}

function assertWorkspaceManager(workspace: ChoreWorkspaceData, participantId: string) {
  const participant = workspace.participantsById[participantId];
  if (!participant || participant.pausedAt) {
    throw new Error('An active household manager is required');
  }
  const activeManagers = Object.values(workspace.participantsById).filter(
    (candidate) => !candidate.pausedAt && candidate.capabilities.includes('manage')
  );
  if (activeManagers.length > 0 && !participant.capabilities.includes('manage')) {
    throw new Error('Only a household manager can change chores and profiles');
  }
}

function assertDefinitionReferences(workspace: ChoreWorkspaceData, definition: ChoreDefinition) {
  if (definition.assignment.participantIds.length === 0) {
    throw new Error('A chore needs at least one eligible participant');
  }
  for (const participantId of definition.assignment.participantIds) {
    const participant = workspace.participantsById[participantId];
    if (!participant || participant.pausedAt || !participant.capabilities.includes('complete')) {
      throw new Error('Chore assignment includes an ineligible participant');
    }
  }
  for (const approverId of definition.approval.approverIds) {
    const approver = workspace.participantsById[approverId];
    if (!approver || approver.pausedAt || !approver.capabilities.includes('approve')) {
      throw new Error('Chore approval includes an ineligible participant');
    }
  }
  if (definition.approval.required && definition.approval.approverIds.length === 0) {
    throw new Error('A chore requiring approval needs an approver');
  }
}

function isWorkspaceMissionComplete(workspace: ChoreWorkspaceData, mission: ChoreMission) {
  const startsAt = Date.parse(mission.startsAt ?? mission.createdAt);
  const endsAt = mission.endsAt ? Date.parse(mission.endsAt) : Number.POSITIVE_INFINITY;
  const completedDefinitionIds = new Set(
    Object.values(workspace.occurrencesById)
      .filter((occurrence) => {
        const scheduledAt = Date.parse(occurrence.scheduledAt);
        return occurrence.status === 'done' && scheduledAt >= startsAt && scheduledAt <= endsAt;
      })
      .map((occurrence) => occurrence.definitionId)
  );
  return mission.definitionIds.every((definitionId) => completedDefinitionIds.has(definitionId));
}

/** Applies every Navet-owned household mutation against the storage authority's current data. */
export function applyChoreWorkspaceAction(
  input: ApplyChoreWorkspaceActionInput
): ApplyChoreWorkspaceActionResult {
  const { action, commandId, timestamp, workspace } = input;
  if (action.type === 'occurrence_action') {
    const previousOccurrence = workspace.occurrencesById[action.occurrenceId];
    const result = applyChoreWorkspaceOccurrenceCommand({
      commandId,
      command: action.action,
      occurrenceId: action.occurrenceId,
      timestamp,
      workspace,
    });
    const experience = workspace.experience ?? createChoreExperienceState();
    if (!previousOccurrence || experience.gamificationMode === 'off') {
      return { activity: result.activity, data: result.data };
    }
    const points = experience.presentationByDefinitionId[previousOccurrence.definitionId]?.points;
    const becameFinal = previousOccurrence.status !== 'done' && result.occurrence.status === 'done';
    const stoppedBeingFinal =
      previousOccurrence.status === 'done' && result.occurrence.status !== 'done';
    const participantId = becameFinal
      ? result.occurrence.completedBy
      : stoppedBeingFinal
        ? previousOccurrence.completedBy
        : undefined;
    let nextExperience = experience;
    const pointsDelta =
      points && participantId ? (becameFinal ? points : stoppedBeingFinal ? -points : 0) : 0;
    if (points && participantId && (becameFinal || stoppedBeingFinal)) {
      const balances = getChoreExperiencePointBalances(workspace);
      balances[participantId] = (balances[participantId] ?? 0) + pointsDelta;
      nextExperience = { ...nextExperience, earnedPointsByParticipant: balances };
    }
    const awardedMissionIds = [...(experience.awardedMissionIds ?? [])];
    let householdBonusPoints = experience.householdBonusPoints ?? 0;
    for (const mission of Object.values(experience.missionsById)) {
      if (
        !mission.rewardPoints ||
        mission.status === 'complete' ||
        awardedMissionIds.includes(mission.id) ||
        isWorkspaceMissionComplete(workspace, mission) ||
        !isWorkspaceMissionComplete(result.data, mission)
      ) {
        continue;
      }
      awardedMissionIds.push(mission.id);
      householdBonusPoints += mission.rewardPoints;
    }
    if (
      householdBonusPoints !== (experience.householdBonusPoints ?? 0) ||
      awardedMissionIds.length !== (experience.awardedMissionIds ?? []).length
    ) {
      nextExperience = { ...nextExperience, householdBonusPoints, awardedMissionIds };
    }
    const activity = pointsDelta
      ? { ...result.activity, participantId, pointsDelta }
      : result.activity;
    if (nextExperience === experience) return { activity, data: result.data };
    return {
      activity,
      data: {
        ...result.data,
        experience: nextExperience,
      },
    };
  }

  if (action.type === 'participant_create') {
    if (!isChoreParticipant(action.participant, action.participant.id)) {
      throw new Error('Household profile is invalid');
    }
    if (workspace.participantsById[action.participant.id]) {
      throw new Error('Household profile already exists');
    }
    if (Object.keys(workspace.participantsById).length === 0) {
      if (!action.participant.capabilities.includes('manage')) {
        throw new Error('The first household profile must be a manager');
      }
    } else {
      if (!action.actorParticipantId) throw new Error('A household manager is required');
      assertWorkspaceManager(workspace, action.actorParticipantId);
    }
    return {
      activity: buildWorkspaceActivity({
        commandId,
        timestamp,
        type: 'participant_created',
        actorParticipantId: action.actorParticipantId,
        participantId: action.participant.id,
      }),
      data: {
        ...workspace,
        participantsById: {
          ...workspace.participantsById,
          [action.participant.id]: action.participant,
        },
      },
    };
  }

  if (action.type === 'participant_update') {
    assertWorkspaceManager(workspace, action.actorParticipantId);
    const current = workspace.participantsById[action.participant.id];
    if (!current) throw new Error('Household profile is no longer available');
    if (
      !isChoreParticipant(action.participant, action.participant.id) ||
      action.participant.createdAt !== current.createdAt
    ) {
      throw new Error('Household profile update is invalid');
    }
    const nextParticipants = {
      ...workspace.participantsById,
      [action.participant.id]: action.participant,
    };
    const activeManagerCount = Object.values(nextParticipants).filter(
      (participant) => !participant.pausedAt && participant.capabilities.includes('manage')
    ).length;
    if (activeManagerCount === 0) throw new Error('The household needs an active manager');
    return {
      activity: buildWorkspaceActivity({
        commandId,
        timestamp,
        type: 'participant_updated',
        actorParticipantId: action.actorParticipantId,
        participantId: action.participant.id,
      }),
      data: { ...workspace, participantsById: nextParticipants },
    };
  }

  if (action.type === 'definition_create' || action.type === 'definition_update') {
    assertWorkspaceManager(workspace, action.actorParticipantId);
    if (!isChoreDefinition(action.definition, action.definition.id)) {
      throw new Error('Chore definition is invalid');
    }
    const current = workspace.definitionsById[action.definition.id];
    if (action.type === 'definition_create' && current) throw new Error('Chore already exists');
    if (action.type === 'definition_update' && !current) {
      throw new Error('Chore is no longer available');
    }
    if (
      action.type === 'definition_update' &&
      current &&
      action.definition.createdAt !== current.createdAt
    ) {
      throw new Error('Chore creation time cannot be changed');
    }
    assertDefinitionReferences(workspace, action.definition);
    const shouldRematerialize =
      action.type === 'definition_update' &&
      current !== undefined &&
      definitionMaterializationChanged(current, action.definition);
    const removedOccurrenceIds = new Set<string>();
    const occurrencesById = shouldRematerialize
      ? Object.fromEntries(
          Object.entries(workspace.occurrencesById).filter(([id, occurrence]) => {
            const shouldRemove =
              occurrence.definitionId === action.definition.id &&
              canDiscardForRematerialization(occurrence);
            if (shouldRemove) removedOccurrenceIds.add(id);
            return !shouldRemove;
          })
        )
      : workspace.occurrencesById;
    const outbox =
      removedOccurrenceIds.size > 0
        ? workspace.outbox.filter(
            (item) =>
              item.status === 'delivered' ||
              !item.occurrenceId ||
              !removedOccurrenceIds.has(item.occurrenceId)
          )
        : workspace.outbox;
    return {
      activity: buildWorkspaceActivity({
        commandId,
        timestamp,
        type: action.type === 'definition_create' ? 'definition_created' : 'definition_updated',
        actorParticipantId: action.actorParticipantId,
        definitionId: action.definition.id,
      }),
      data: {
        ...workspace,
        occurrencesById,
        outbox,
        definitionsById: {
          ...workspace.definitionsById,
          [action.definition.id]: action.definition,
        },
      },
    };
  }

  if (action.type === 'definition_archive' || action.type === 'definition_restore') {
    assertWorkspaceManager(workspace, action.actorParticipantId);
    const definition = workspace.definitionsById[action.definitionId];
    if (!definition) throw new Error('Chore is no longer available');
    const nextDefinition = { ...definition, enabled: true, updatedAt: timestamp };
    if (action.type === 'definition_archive') {
      nextDefinition.enabled = false;
      nextDefinition.archivedAt = timestamp;
    } else {
      delete nextDefinition.archivedAt;
    }
    const occurrencesById =
      action.type === 'definition_archive'
        ? Object.fromEntries(
            Object.entries(workspace.occurrencesById).filter(
              ([, occurrence]) =>
                occurrence.definitionId !== action.definitionId ||
                occurrence.status === 'done' ||
                occurrence.status === 'skipped'
            )
          )
        : workspace.occurrencesById;
    return {
      activity: buildWorkspaceActivity({
        commandId,
        timestamp,
        type: action.type === 'definition_archive' ? 'definition_archived' : 'definition_updated',
        actorParticipantId: action.actorParticipantId,
        definitionId: action.definitionId,
      }),
      data: {
        ...workspace,
        definitionsById: {
          ...workspace.definitionsById,
          [action.definitionId]: nextDefinition,
        },
        occurrencesById,
      },
    };
  }

  if (action.type === 'retention_update') {
    assertWorkspaceManager(workspace, action.actorParticipantId);
    if (!isChoreHistoryRetentionPolicy(action.policy)) {
      throw new Error('Chore history retention policy is invalid');
    }
    return {
      activity: buildWorkspaceActivity({
        commandId,
        timestamp,
        type: 'retention_updated',
        actorParticipantId: action.actorParticipantId,
      }),
      data: { ...workspace, historyRetention: { ...action.policy } },
    };
  }

  if (action.type === 'experience_update') {
    assertWorkspaceManager(workspace, action.actorParticipantId);
    if (!isChoreExperienceState(action.experience)) {
      throw new Error('Chore experience data is invalid');
    }
    for (const definitionId of Object.keys(action.experience.presentationByDefinitionId)) {
      if (!workspace.definitionsById[definitionId]) {
        throw new Error('Chore experience references an unavailable chore');
      }
    }
    for (const mission of Object.values(action.experience.missionsById)) {
      if (mission.definitionIds.some((definitionId) => !workspace.definitionsById[definitionId])) {
        throw new Error('Chore mission references an unavailable chore');
      }
    }
    for (const goal of Object.values(action.experience.rewardGoalsById)) {
      if (goal.participantId && !workspace.participantsById[goal.participantId]) {
        throw new Error('Chore reward references an unavailable participant');
      }
    }
    for (const participantId of Object.keys(action.experience.earnedPointsByParticipant ?? {})) {
      if (!workspace.participantsById[participantId]) {
        throw new Error('Chore experience points reference an unavailable participant');
      }
    }
    return {
      activity: buildWorkspaceActivity({
        commandId,
        timestamp,
        type: 'experience_updated',
        actorParticipantId: action.actorParticipantId,
      }),
      data: { ...workspace, experience: action.experience },
    };
  }

  if (action.type === 'experience_points_adjust') {
    assertWorkspaceManager(workspace, action.actorParticipantId);
    if (!workspace.participantsById[action.participantId]) {
      throw new Error('Chore participant is no longer available');
    }
    if (
      !Number.isSafeInteger(action.pointsDelta) ||
      action.pointsDelta === 0 ||
      Math.abs(action.pointsDelta) > 10_000
    ) {
      throw new Error('Point adjustment must be a non-zero whole number up to 10000');
    }
    const reason = action.reason?.trim() || undefined;
    const experience = workspace.experience ?? createChoreExperienceState();
    const balances = getChoreExperiencePointBalances(workspace);
    const nextBalance = (balances[action.participantId] ?? 0) + action.pointsDelta;
    if (Math.abs(nextBalance) > 1_000_000_000) {
      throw new Error('Point balance must stay between -1000000000 and 1000000000');
    }
    balances[action.participantId] = nextBalance;
    return {
      activity: buildWorkspaceActivity({
        commandId,
        timestamp,
        type: 'points_adjusted',
        actorParticipantId: action.actorParticipantId,
        participantId: action.participantId,
        reason,
        pointsDelta: action.pointsDelta,
      }),
      data: {
        ...workspace,
        experience: { ...experience, earnedPointsByParticipant: balances },
      },
    };
  }

  if (action.type === 'reminder_acknowledge') {
    const reminder = workspace.outbox.find((item) => item.id === action.outboxId);
    if (!reminder?.eventType.startsWith('reminder_')) {
      throw new Error('Chore reminder is no longer available');
    }
    const actor = workspace.participantsById[action.actorParticipantId];
    if (!actor || actor.pausedAt) throw new Error('Chore participant is not active');
    if (
      reminder.participantId !== action.actorParticipantId &&
      !actor.capabilities.includes('manage')
    ) {
      throw new Error('Participant cannot acknowledge this chore reminder');
    }
    const activity: ChoreActivity = {
      id: `activity:${commandId}`,
      commandId,
      occurrenceId: reminder.occurrenceId,
      definitionId: reminder.occurrenceId
        ? workspace.occurrencesById[reminder.occurrenceId]?.definitionId
        : undefined,
      participantId: reminder.participantId,
      actorParticipantId: action.actorParticipantId,
      outboxId: reminder.id,
      type: 'reminder_acknowledged',
      timestamp,
    };
    return {
      activity,
      data: {
        ...workspace,
        outbox: workspace.outbox.map((item) =>
          item.id === reminder.id
            ? {
                ...item,
                status: 'delivered' as const,
                deliveredAt: timestamp,
                lastAttemptAt: timestamp,
              }
            : item
        ),
      },
    };
  }

  if (action.type === 'outbox_delivery_update') {
    const target = workspace.outbox.find((item) => item.id === action.outboxId);
    if (!target) throw new Error('Chore outbox item is no longer available');
    const attempt = target.attempts + 1;
    const retryDelay = Math.min(60 * 60_000, 2 ** Math.min(attempt, 10) * 30_000);
    const activity: ChoreActivity = {
      id: `activity:${commandId}`,
      commandId,
      occurrenceId: target.occurrenceId,
      definitionId: target.occurrenceId
        ? workspace.occurrencesById[target.occurrenceId]?.definitionId
        : undefined,
      participantId: target.participantId,
      outboxId: target.id,
      type: 'outbox_delivery_updated',
      reason: action.status === 'failed' ? action.error?.trim() || 'Delivery failed' : undefined,
      timestamp,
    };
    return {
      activity,
      data: {
        ...workspace,
        outbox: workspace.outbox.map((item) =>
          item.id === target.id
            ? {
                ...item,
                status: action.status,
                attempts: attempt,
                lastAttemptAt: timestamp,
                deliveredAt: action.status === 'delivered' ? timestamp : undefined,
                lastError:
                  action.status === 'failed'
                    ? action.error?.trim() || 'Delivery failed'
                    : undefined,
                nextAttemptAt:
                  action.status === 'failed'
                    ? new Date(Date.parse(timestamp) + retryDelay).toISOString()
                    : item.nextAttemptAt,
              }
            : item
        ),
      },
    };
  }

  const rangeStart = Date.parse(action.rangeStart);
  const rangeEnd = Date.parse(action.rangeEnd);
  if (
    !Number.isFinite(rangeStart) ||
    !Number.isFinite(rangeEnd) ||
    rangeEnd < rangeStart ||
    rangeEnd - rangeStart > 180 * 86_400_000
  ) {
    throw new Error('Chore materialization range is invalid');
  }
  const occurrencesById = { ...workspace.occurrencesById };
  const scheduledOccurrenceIdsByDefinition = new Map<string, Set<string>>();
  const occurrenceCreatedActivities: ChoreActivity[] = [];
  for (const definition of Object.values(workspace.definitionsById)) {
    const latestCompletedAt = Object.values(occurrencesById)
      .filter(
        (occurrence) =>
          occurrence.definitionId === definition.id && occurrence.completedAt !== undefined
      )
      .map((occurrence) => occurrence.completedAt as string)
      .sort()
      .at(-1);
    const materialized = materializeChoreOccurrences({
      definition,
      participantsById: workspace.participantsById,
      existingOccurrences: occurrencesById,
      latestCompletedAt,
      rangeStart: action.rangeStart,
      rangeEnd: action.rangeEnd,
    });
    scheduledOccurrenceIdsByDefinition.set(
      definition.id,
      new Set(materialized.map((occurrence) => occurrence.id))
    );
    if (Object.keys(occurrencesById).length + materialized.length > 5000) {
      throw new Error('Too many chore occurrences');
    }
    for (const occurrence of materialized) {
      if (!occurrencesById[occurrence.id]) {
        occurrencesById[occurrence.id] = occurrence;
        occurrenceCreatedActivities.push({
          id: `activity:${commandId}:created:${occurrence.id}`,
          commandId,
          occurrenceId: occurrence.id,
          definitionId: occurrence.definitionId,
          type: 'occurrence_created',
          assigneeIds: occurrence.assigneeIds,
          timestamp,
        });
        const dueAt = Date.parse(occurrence.dueAt);
        const materializedAt = Date.parse(timestamp);
        if (Number.isFinite(dueAt) && materializedAt >= dueAt) {
          occurrenceCreatedActivities.push({
            id: `activity:scheduler:due:${occurrence.id}`,
            commandId: `scheduler:due:${occurrence.id}`,
            occurrenceId: occurrence.id,
            definitionId: occurrence.definitionId,
            assigneeIds: occurrence.assigneeIds,
            type: 'due',
            timestamp: occurrence.dueAt,
          });
        }
        if (Number.isFinite(dueAt) && materializedAt > dueAt) {
          occurrenceCreatedActivities.push({
            id: `activity:scheduler:overdue:${occurrence.id}`,
            commandId: `scheduler:overdue:${occurrence.id}`,
            occurrenceId: occurrence.id,
            definitionId: occurrence.definitionId,
            assigneeIds: occurrence.assigneeIds,
            type: 'overdue',
            timestamp: occurrence.dueAt,
          });
        }
      }
    }
  }
  const removedOccurrenceIds = new Set<string>();
  for (const [id, occurrence] of Object.entries(occurrencesById)) {
    const scheduledIds = scheduledOccurrenceIdsByDefinition.get(occurrence.definitionId);
    const scheduledAt = Date.parse(occurrence.scheduledAt);
    if (
      scheduledIds &&
      scheduledAt >= rangeStart &&
      scheduledAt <= rangeEnd &&
      !scheduledIds.has(id) &&
      canDiscardForRematerialization(occurrence)
    ) {
      delete occurrencesById[id];
      removedOccurrenceIds.add(id);
    }
  }
  const retentionBoundary = Date.parse(timestamp) - 90 * 86_400_000;
  for (const occurrence of Object.values(occurrencesById)) {
    if (
      (occurrence.status === 'done' || occurrence.status === 'skipped') &&
      Date.parse(occurrence.scheduledAt) < retentionBoundary
    ) {
      delete occurrencesById[occurrence.id];
    }
  }
  return {
    activity: buildWorkspaceActivity({ commandId, timestamp, type: 'workspace_materialized' }),
    additionalActivities: occurrenceCreatedActivities,
    data: {
      ...workspace,
      occurrencesById,
      outbox:
        removedOccurrenceIds.size === 0
          ? workspace.outbox
          : workspace.outbox.filter(
              (item) =>
                item.status === 'delivered' ||
                !item.occurrenceId ||
                !removedOccurrenceIds.has(item.occurrenceId)
            ),
    },
  };
}

export function getChoreExperiencePointBalances(
  workspace: ChoreWorkspaceData
): Record<string, number> {
  const experience = workspace.experience ?? createChoreExperienceState();
  const persisted = experience.earnedPointsByParticipant;
  if (persisted && Object.keys(persisted).length > 0) return { ...persisted };
  const balances: Record<string, number> = {};
  for (const occurrence of Object.values(workspace.occurrencesById)) {
    if (occurrence.status !== 'done' || !occurrence.completedBy) continue;
    const points = experience.presentationByDefinitionId[occurrence.definitionId]?.points ?? 0;
    balances[occurrence.completedBy] = (balances[occurrence.completedBy] ?? 0) + points;
  }
  return balances;
}
