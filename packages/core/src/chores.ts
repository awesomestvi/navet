export const CHORE_WORKSPACE_SCHEMA_VERSION = 1 as const;

export type ChoreParticipantCapability = 'complete' | 'approve' | 'manage';

export interface ChoreParticipant {
  id: string;
  displayName: string;
  color?: string;
  avatarUrl?: string;
  capabilities: ChoreParticipantCapability[];
  pausedAt?: string;
  linkedAccountId?: string;
  linkedPersonEntityId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ChoreAssignmentMode = 'person' | 'anyone' | 'everyone' | 'rotation';

export interface ChoreAssignment {
  mode: ChoreAssignmentMode;
  participantIds: string[];
  rotationCursor?: number;
}

export type ChoreSchedule =
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
      dayOfMonth: number;
    }
  | {
      frequency: 'after_completion';
      startDate: string;
      time: string;
      timeZone: string;
      intervalDays: number;
    };

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
  createdAt: string;
  updatedAt: string;
  archivedAt?: string;
}

export type ChoreOccurrenceStatus =
  | 'available'
  | 'claimed'
  | 'awaiting_approval'
  | 'done'
  | 'skipped';

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
  updatedAt: string;
}

export type ChoreActivityType =
  | 'participant_created'
  | 'participant_updated'
  | 'definition_created'
  | 'definition_updated'
  | 'definition_archived'
  | 'workspace_materialized'
  | 'occurrence_created'
  | 'claimed'
  | 'completed'
  | 'approved'
  | 'rejected'
  | 'skipped'
  | 'reopened';

export interface ChoreActivity {
  id: string;
  commandId: string;
  occurrenceId?: string;
  definitionId?: string;
  participantId?: string;
  type: ChoreActivityType;
  actorParticipantId?: string;
  timestamp: string;
}

export interface ChoreWorkspaceData {
  schemaVersion: typeof CHORE_WORKSPACE_SCHEMA_VERSION;
  participantsById: Record<string, ChoreParticipant>;
  definitionsById: Record<string, ChoreDefinition>;
  occurrencesById: Record<string, ChoreOccurrence>;
  activity: ChoreActivity[];
}

export type ChoreOccurrenceCommand =
  | { type: 'claim'; participantId: string }
  | { type: 'complete'; participantId: string }
  | { type: 'approve'; participantId: string }
  | { type: 'reject'; participantId: string }
  | { type: 'skip'; participantId: string }
  | { type: 'reopen'; participantId: string };

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

function isScheduledOnDate(
  schedule: Exclude<ChoreSchedule, { frequency: 'after_completion' }>,
  dateKey: string
) {
  const startDate = scheduleStartDate(schedule);
  if (dateKey < startDate) {
    return false;
  }

  if (schedule.frequency === 'once') {
    return dateKey === schedule.date;
  }

  if (schedule.frequency === 'daily') {
    return !schedule.daysOfWeek || schedule.daysOfWeek.includes(getDayOfWeek(dateKey));
  }

  if (schedule.frequency === 'weekly') {
    const weeksSinceStart = Math.floor(differenceInCalendarDays(dateKey, startDate) / 7);
    return (
      weeksSinceStart % (schedule.intervalWeeks ?? 1) === 0 &&
      schedule.daysOfWeek.includes(getDayOfWeek(dateKey))
    );
  }

  const { year, month, day } = parseDateKey(dateKey);
  return day === Math.min(schedule.dayOfMonth, getLastDayOfMonth(year, month));
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
  return (
    value.id === expectedId &&
    typeof value.displayName === 'string' &&
    value.displayName.trim().length > 0 &&
    isStringArray(value.capabilities) &&
    value.capabilities.every((capability) =>
      ['complete', 'approve', 'manage'].includes(capability)
    ) &&
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
  if (value.frequency === 'once') {
    return typeof value.date === 'string' && DATE_PATTERN.test(value.date);
  }
  if (typeof value.startDate !== 'string' || !DATE_PATTERN.test(value.startDate)) return false;
  if (value.frequency === 'daily') {
    return (
      value.daysOfWeek === undefined ||
      (Array.isArray(value.daysOfWeek) &&
        value.daysOfWeek.every(
          (day) => Number.isSafeInteger(day) && Number(day) >= 0 && Number(day) <= 6
        ))
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
    return (
      Number.isSafeInteger(value.dayOfMonth) &&
      Number(value.dayOfMonth) >= 1 &&
      Number(value.dayOfMonth) <= 31
    );
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
    typeof value.enabled === 'boolean' &&
    ['person', 'anyone', 'everyone', 'rotation'].includes(String(value.assignment.mode)) &&
    isStringArray(value.assignment.participantIds) &&
    (value.assignment.rotationCursor === undefined ||
      (Number.isSafeInteger(value.assignment.rotationCursor) &&
        Number(value.assignment.rotationCursor) >= 0)) &&
    isChoreSchedule(value.schedule) &&
    Number.isFinite(value.dueWindowMinutes) &&
    Number(value.dueWindowMinutes) >= 0 &&
    typeof value.approval.required === 'boolean' &&
    isStringArray(value.approval.approverIds) &&
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
    ['available', 'claimed', 'awaiting_approval', 'done', 'skipped'].includes(
      String(value.status)
    ) &&
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
      'occurrence_created',
      'claimed',
      'completed',
      'approved',
      'rejected',
      'skipped',
      'reopened',
    ].includes(String(value.type)) &&
    isIsoTimestamp(value.timestamp) &&
    (value.occurrenceId === undefined || typeof value.occurrenceId === 'string') &&
    (value.definitionId === undefined || typeof value.definitionId === 'string') &&
    (value.participantId === undefined || typeof value.participantId === 'string') &&
    (value.actorParticipantId === undefined || typeof value.actorParticipantId === 'string')
  );
}

export function createEmptyChoreWorkspace(): ChoreWorkspaceData {
  return {
    schemaVersion: CHORE_WORKSPACE_SCHEMA_VERSION,
    participantsById: {},
    definitionsById: {},
    occurrencesById: {},
    activity: [],
  };
}

export function isChoreWorkspaceData(value: unknown): value is ChoreWorkspaceData {
  if (!value || typeof value !== 'object' || Array.isArray(value)) {
    return false;
  }

  const candidate = value as Partial<ChoreWorkspaceData>;
  if (
    !(
      candidate.schemaVersion === CHORE_WORKSPACE_SCHEMA_VERSION &&
      Boolean(candidate.participantsById) &&
      typeof candidate.participantsById === 'object' &&
      !Array.isArray(candidate.participantsById) &&
      Boolean(candidate.definitionsById) &&
      typeof candidate.definitionsById === 'object' &&
      !Array.isArray(candidate.definitionsById) &&
      Boolean(candidate.occurrencesById) &&
      typeof candidate.occurrencesById === 'object' &&
      !Array.isArray(candidate.occurrencesById) &&
      Array.isArray(candidate.activity)
    )
  ) {
    return false;
  }

  return (
    Object.entries(candidate.participantsById as Record<string, unknown>).every(
      ([id, participant]) => isChoreParticipant(participant, id)
    ) &&
    Object.entries(candidate.definitionsById as Record<string, unknown>).every(([id, definition]) =>
      isChoreDefinition(definition, id)
    ) &&
    Object.entries(candidate.occurrencesById as Record<string, unknown>).every(([id, occurrence]) =>
      isChoreOccurrence(occurrence, id)
    ) &&
    candidate.activity.every(isChoreActivity)
  );
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
    if (nextDate >= rangeStartDateKey && nextDate <= finalDateKey) {
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
    const scheduledAt = localDateTimeToIso(scheduledDate, schedule.time, schedule.timeZone);
    const scheduledTime = new Date(scheduledAt).getTime();
    if (scheduledTime < rangeStartTime || scheduledTime > rangeEndTime) {
      continue;
    }

    const slots = resolveAssignmentSlots(definition.assignment, participantsById, scheduledIndex);
    for (const slot of slots) {
      const id = buildOccurrenceId(definition.id, scheduledAt, slot.assignmentSlot);
      occurrences.push(
        existingOccurrences[id] ??
          createOccurrence(definition, scheduledAt, slot.assignmentSlot, slot.assigneeIds)
      );
    }
  }

  return occurrences;
}

function assertAssigned(occurrence: ChoreOccurrence, participantId: string) {
  if (!occurrence.assigneeIds.includes(participantId)) {
    throw new Error('Participant is not assigned to this chore occurrence');
  }
}

function buildActivity(input: ApplyChoreCommandInput, type: ChoreActivityType): ChoreActivity {
  return {
    id: `activity:${input.commandId}`,
    commandId: input.commandId,
    occurrenceId: input.occurrence.id,
    definitionId: input.definition.id,
    type,
    actorParticipantId: input.command.participantId,
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
      if (occurrence.status !== 'available') {
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
      if (occurrence.status !== 'available' && occurrence.status !== 'claimed') {
        throw new Error('Only available or claimed chores can be completed');
      }
      if (occurrence.status === 'claimed' && occurrence.claimedBy !== participantId) {
        throw new Error('A claimed chore can only be completed by its claimant');
      }
      nextOccurrence = {
        ...occurrence,
        status: definition.approval.required ? 'awaiting_approval' : 'done',
        claimedBy: occurrence.claimedBy ?? participantId,
        claimedAt: occurrence.claimedAt ?? timestamp,
        completedBy: participantId,
        completedAt: timestamp,
        updatedAt: timestamp,
      };
      break;
    }
    case 'approve': {
      if (
        !definition.approval.required ||
        !definition.approval.approverIds.includes(participantId)
      ) {
        throw new Error('Participant cannot approve this chore');
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
      if (
        !definition.approval.required ||
        !definition.approval.approverIds.includes(participantId)
      ) {
        throw new Error('Participant cannot reject this chore');
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
      assertAssigned(occurrence, participantId);
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
      if (occurrence.status !== 'done' && occurrence.status !== 'skipped') {
        throw new Error('Only completed or skipped chores can be reopened');
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
  };

  return {
    occurrence: nextOccurrence,
    activity: buildActivity(input, activityType[command.type]),
  };
}
