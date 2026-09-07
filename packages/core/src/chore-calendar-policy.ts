import type { ChoreAssignment, ChoreParticipant, ChoreSchedule } from './chores.ts';

const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function parseDateKey(dateKey: string) {
  if (!DATE_PATTERN.test(dateKey)) {
    throw new Error(`Invalid chore date: ${dateKey}`);
  }

  const parts = dateKey.split('-').map(Number);
  const year = parts[0];
  const month = parts[1];
  const day = parts[2];
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

export function formatDateKey(date: Date) {
  return [
    String(date.getUTCFullYear()).padStart(4, '0'),
    String(date.getUTCMonth() + 1).padStart(2, '0'),
    String(date.getUTCDate()).padStart(2, '0'),
  ].join('-');
}

export function addCalendarDays(dateKey: string, days: number) {
  const date = parseDateKey(dateKey);
  const year = date.year;
  const month = date.month;
  const day = date.day;
  return formatDateKey(new Date(Date.UTC(year, month - 1, day + days)));
}

export function differenceInCalendarDays(left: string, right: string) {
  const leftDate = parseDateKey(left);
  const rightDate = parseDateKey(right);
  const leftTime = Date.UTC(leftDate.year, leftDate.month - 1, leftDate.day);
  const rightTime = Date.UTC(rightDate.year, rightDate.month - 1, rightDate.day);
  return Math.round((leftTime - rightTime) / 86_400_000);
}

export function getDayOfWeek(dateKey: string) {
  const date = parseDateKey(dateKey);
  const year = date.year;
  const month = date.month;
  const day = date.day;
  return new Date(Date.UTC(year, month - 1, day)).getUTCDay();
}

function getLastDayOfMonth(year: number, month: number) {
  return new Date(Date.UTC(year, month, 0)).getUTCDate();
}

export function scheduleStartDate(schedule: ChoreSchedule) {
  return schedule.frequency === 'once' ? schedule.date : schedule.startDate;
}

export function isScheduledOnDate(
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

  const date = parseDateKey(dateKey);
  const year = date.year;
  const month = date.month;
  const day = date.day;
  const lastDay = getLastDayOfMonth(year, month);
  if (schedule.nthWeekday) {
    if (getDayOfWeek(dateKey) !== schedule.nthWeekday.weekday) return false;
    return schedule.nthWeekday.ordinal === -1
      ? day + 7 > lastDay
      : Math.ceil(day / 7) === schedule.nthWeekday.ordinal;
  }
  return day === Math.min(schedule.dayOfMonth ?? 1, lastDay);
}

export function scheduleTimes(schedule: ChoreSchedule) {
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

export function rotationIndexForDate(
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

export function resolveAssignmentSlots(
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
