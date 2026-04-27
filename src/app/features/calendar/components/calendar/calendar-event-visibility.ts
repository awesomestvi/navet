import type { CalendarEvent } from './types';

interface CalendarEventInterval {
  start: Date | null;
  end: Date | null;
}

function parseDate(value?: string): Date | null {
  if (!value) {
    return null;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}

function getEndOfDay(date: Date): Date {
  const endOfDay = new Date(date);
  endOfDay.setHours(23, 59, 59, 999);
  return endOfDay;
}

export function getCalendarEventInterval(event: CalendarEvent): CalendarEventInterval {
  const start = parseDate(event.startDateTime ?? event.sortKey);
  const explicitEnd = parseDate(event.endDateTime);

  if (explicitEnd) {
    return { start, end: explicitEnd };
  }

  if (event.isAllDay && start) {
    return {
      start,
      end: getEndOfDay(start),
    };
  }

  return {
    start,
    end: start,
  };
}

export function isCalendarEventVisibleInWindow(
  event: CalendarEvent,
  windowStart: Date,
  windowEnd: Date
): boolean {
  const { start, end } = getCalendarEventInterval(event);

  if (!start && !end) {
    return true;
  }

  const effectiveStart = start ?? end;
  const effectiveEnd = end ?? start;

  if (!effectiveStart || !effectiveEnd) {
    return true;
  }

  return effectiveEnd >= windowStart && effectiveStart <= windowEnd;
}

export function getCalendarEventSortValue(event: CalendarEvent): string {
  return event.startDateTime ?? event.sortKey ?? event.startTime;
}
