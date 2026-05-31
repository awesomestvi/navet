import type { TranslateFn } from '@navet/app/i18n/index';
import type { CalendarDevice } from '@navet/app/types/device.types';
import {
  formatCalendarTime,
  inferCalendarEventType,
  isAllDayCalendarValue,
  parseCalendarDate,
} from '../entity-utils';

type CalendarServiceEvent = Record<string, unknown>;
type CalendarEntityLike = {
  state: string;
  attributes?: Record<string, unknown>;
};

interface CalendarContext {
  locale: string;
  t: TranslateFn;
  use24HourTime: boolean;
  calendarEvents: Record<string, CalendarServiceEvent[]>;
  eventLookupId?: string;
}

export function mapCalendarSources(
  entityId: string,
  entity: CalendarEntityLike,
  name: string,
  room: string,
  context: CalendarContext
): NonNullable<CalendarDevice['sources']> {
  const { calendarEvents, eventLookupId, locale, t, use24HourTime } = context;
  const rawEvents = calendarEvents[eventLookupId ?? entityId] ?? [];
  const fallbackTitle =
    typeof entity.attributes?.message === 'string' ? entity.attributes.message : '';
  const fallbackLocation =
    typeof entity.attributes?.location === 'string' ? entity.attributes.location : undefined;
  const fallbackEvents =
    fallbackTitle.length > 0
      ? [
          {
            id: `${entityId}-current`,
            title: fallbackTitle,
            start: entity.attributes?.start_time,
            end: entity.attributes?.end_time,
            location: fallbackLocation,
          },
        ]
      : [];

  const colors = [
    'bg-blue-500',
    'bg-purple-500',
    'bg-green-500',
    'bg-orange-500',
    'bg-indigo-500',
  ] as const;

  const events = (rawEvents.length > 0 ? rawEvents : fallbackEvents)
    .map((rawEvent, index) => {
      const eventRecord = rawEvent as Record<string, unknown>;
      const title =
        typeof eventRecord.title === 'string'
          ? eventRecord.title
          : typeof eventRecord.summary === 'string'
            ? eventRecord.summary
            : typeof eventRecord.message === 'string'
              ? eventRecord.message
              : t('calendar.fallbackEvent', { count: index + 1 });
      const location = typeof eventRecord.location === 'string' ? eventRecord.location : undefined;
      const description =
        typeof eventRecord.description === 'string'
          ? eventRecord.description
          : typeof eventRecord.notes === 'string'
            ? eventRecord.notes
            : typeof eventRecord.message === 'string'
              ? eventRecord.message
              : undefined;
      const startDate = parseCalendarDate(eventRecord.start ?? eventRecord.start_time);
      const endDate = parseCalendarDate(eventRecord.end ?? eventRecord.end_time);
      const isAllDay = isAllDayCalendarValue(eventRecord.start ?? eventRecord.start_time);
      const startTime = formatCalendarTime(startDate, locale, use24HourTime);
      const endTime = formatCalendarTime(endDate, locale, use24HourTime);
      const attendees = Array.isArray(eventRecord.attendees)
        ? eventRecord.attendees.length
        : typeof eventRecord.attendees === 'number'
          ? eventRecord.attendees
          : undefined;

      return {
        id:
          (typeof eventRecord.uid === 'string' && eventRecord.uid) ||
          (typeof eventRecord.id === 'string' && eventRecord.id) ||
          `${entityId}-${index}`,
        title,
        startTime,
        endTime,
        timeDisplay: startTime,
        startDateTime: startDate?.toISOString(),
        endDateTime: endDate?.toISOString(),
        isAllDay,
        location,
        description,
        type: inferCalendarEventType(title, location),
        color: colors[index % colors.length],
        attendees,
        sortKey: startDate?.toISOString(),
        sourceId: entityId,
        sourceName: name,
        startDate,
      };
    })
    .sort((left, right) => {
      const leftTime = left.startDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      const rightTime = right.startDate?.getTime() ?? Number.MAX_SAFE_INTEGER;
      return leftTime - rightTime;
    })
    .slice(0, 5)
    .map(({ startDate: _startDate, ...event }) => event);

  return [
    {
      id: entityId,
      name,
      room,
      events,
    },
  ];
}
