import type { CalendarEvent } from './types';

export function formatCalendarEventTimeLabel(event: CalendarEvent, allDayLabel = 'All day') {
  if (event.isAllDay) {
    return allDayLabel;
  }

  if (event.startTime !== '--' && event.endTime !== '--') {
    return `${event.startTime} - ${event.endTime}`;
  }

  return event.timeDisplay;
}

export function getCalendarDateParts(date: Date | null, locale?: string) {
  if (!date) {
    return {
      weekdayShort: '--',
      dayNumber: '--',
      monthShort: '--',
    };
  }

  return {
    weekdayShort: date.toLocaleDateString(locale ? [locale] : undefined, { weekday: 'short' }),
    dayNumber: date.getDate().toString(),
    monthShort: date.toLocaleDateString(locale ? [locale] : undefined, { month: 'short' }),
  };
}

export function formatCalendarGroupLabel(date: Date | null, locale?: string) {
  const { weekdayShort, dayNumber, monthShort } = getCalendarDateParts(date, locale);
  return `${weekdayShort}, ${dayNumber} ${monthShort}`;
}
