import { useMemo } from 'react';
import type { CalendarEvent, CalendarEventGroup } from './types';

function toIsoDate(baseDate: Date, dayOffset: number, hours: number, minutes = 0) {
  const nextDate = new Date(baseDate);
  nextDate.setDate(baseDate.getDate() + dayOffset);
  nextDate.setHours(hours, minutes, 0, 0);
  return nextDate.toISOString();
}

function groupEventsByDay(events: CalendarEvent[]): CalendarEventGroup[] {
  const groups = new Map<string, CalendarEventGroup>();

  for (const event of events) {
    const eventDate = event.sortKey ? new Date(event.sortKey) : null;
    const isValidDate = eventDate && !Number.isNaN(eventDate.getTime());
    const key = isValidDate ? eventDate.toISOString().slice(0, 10) : `unknown-${event.id}`;

    const existing = groups.get(key);
    if (existing) {
      existing.events.push(event);
      continue;
    }

    groups.set(key, {
      key,
      date: isValidDate ? eventDate : null,
      events: [event],
    });
  }

  return Array.from(groups.values());
}

export function useCalendarData(events?: CalendarEvent[]) {
  const currentDate = useMemo(() => new Date(), []);

  const mockEvents = useMemo<CalendarEvent[]>(
    () => [
      {
        id: '1',
        title: 'Friday planning',
        startTime: '9:00 AM',
        endTime: '9:30 AM',
        timeDisplay: '9:00 AM',
        startDateTime: toIsoDate(currentDate, 0, 9, 0),
        endDateTime: toIsoDate(currentDate, 0, 9, 30),
        type: 'event',
        color: 'bg-blue-500',
        attendees: 8,
        sortKey: toIsoDate(currentDate, 0, 9, 0),
      },
      {
        id: '2',
        title: 'Groceries pickup',
        startTime: '1:00 PM',
        endTime: '1:30 PM',
        timeDisplay: '1:00 PM',
        startDateTime: toIsoDate(currentDate, 0, 13, 0),
        endDateTime: toIsoDate(currentDate, 0, 13, 30),
        location: 'Market Hall',
        type: 'event',
        color: 'bg-purple-500',
        sortKey: toIsoDate(currentDate, 0, 13, 0),
      },
      {
        id: '3',
        title: 'Food waste pickup tomorrow',
        startTime: '--',
        endTime: '--',
        timeDisplay: '--',
        startDateTime: toIsoDate(currentDate, 1, 0, 0),
        isAllDay: true,
        location: 'Home',
        type: 'event',
        color: 'bg-green-500',
        sortKey: toIsoDate(currentDate, 1, 0, 0),
      },
      {
        id: '4',
        title: 'Appointment: Handledarkurs',
        startTime: '5:00 PM',
        endTime: '8:10 PM',
        timeDisplay: '5:00 PM',
        startDateTime: toIsoDate(currentDate, 3, 17, 0),
        endDateTime: toIsoDate(currentDate, 3, 20, 10),
        location: 'LBS Kreativa Gymnasiet Bredgatan 10, 222 21 Lund',
        type: 'event',
        color: 'bg-orange-500',
        sortKey: toIsoDate(currentDate, 3, 17, 0),
      },
      {
        id: '5',
        title: 'Swimming lessons',
        startTime: '3:30 PM',
        endTime: '4:00 PM',
        timeDisplay: '3:30 PM',
        startDateTime: toIsoDate(currentDate, 3, 15, 30),
        endDateTime: toIsoDate(currentDate, 3, 16, 0),
        location: 'Tillfallig Simhall',
        type: 'event',
        color: 'bg-indigo-500',
        sortKey: toIsoDate(currentDate, 3, 15, 30),
      },
    ],
    [currentDate]
  );

  const sourceEvents = useMemo(() => events ?? mockEvents, [events, mockEvents]);
  const groupedEvents = useMemo(() => groupEventsByDay(sourceEvents), [sourceEvents]);
  const nextEvent = useMemo(() => sourceEvents[0] ?? null, [sourceEvents]);
  const smallGroups = useMemo(() => groupedEvents, [groupedEvents]);
  const mediumGroups = useMemo(() => groupedEvents, [groupedEvents]);
  const largeGroups = useMemo(() => groupedEvents.slice(0, 4), [groupedEvents]);

  return {
    currentDate,
    sourceEvents,
    groupedEvents,
    nextEvent,
    smallGroups,
    mediumGroups,
    largeGroups,
    mockEvents,
  };
}
