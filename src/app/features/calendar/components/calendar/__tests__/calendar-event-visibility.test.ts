import { describe, expect, it, vi } from 'vitest';
import {
  getCalendarEventInterval,
  isCalendarEventVisibleInWindow,
} from '../calendar-event-visibility';
import type { CalendarEvent } from '../types';

function createEvent(overrides: Partial<CalendarEvent> = {}): CalendarEvent {
  return {
    id: 'event-1',
    title: 'Calendar event',
    startTime: '10:00',
    endTime: '11:00',
    timeDisplay: '10:00',
    type: 'event',
    color: 'bg-blue-500',
    ...overrides,
  };
}

describe('calendar event visibility', () => {
  it('keeps a same-day all-day event visible at midday', () => {
    const now = new Date('2026-04-27T12:00:00.000Z');
    const windowEnd = new Date('2026-05-04T12:00:00.000Z');
    const event = createEvent({
      isAllDay: true,
      startDateTime: '2026-04-27T00:00:00.000Z',
      sortKey: '2026-04-27T00:00:00.000Z',
    });

    expect(isCalendarEventVisibleInWindow(event, now, windowEnd)).toBe(true);
  });

  it('shows an all-day event before it starts', () => {
    const now = new Date('2026-04-27T12:00:00.000Z');
    const windowEnd = new Date('2026-05-04T12:00:00.000Z');
    const event = createEvent({
      isAllDay: true,
      startDateTime: '2026-04-28T00:00:00.000Z',
      sortKey: '2026-04-28T00:00:00.000Z',
    });

    expect(isCalendarEventVisibleInWindow(event, now, windowEnd)).toBe(true);
  });

  it('keeps a timed event visible while it is still in progress', () => {
    const now = new Date('2026-04-27T12:00:00.000Z');
    const windowEnd = new Date('2026-05-04T12:00:00.000Z');
    const event = createEvent({
      startDateTime: '2026-04-27T11:00:00.000Z',
      endDateTime: '2026-04-27T13:00:00.000Z',
      sortKey: '2026-04-27T11:00:00.000Z',
    });

    expect(isCalendarEventVisibleInWindow(event, now, windowEnd)).toBe(true);
  });

  it('hides an event that already ended', () => {
    const now = new Date('2026-04-27T12:00:00.000Z');
    const windowEnd = new Date('2026-05-04T12:00:00.000Z');
    const event = createEvent({
      startDateTime: '2026-04-27T09:00:00.000Z',
      endDateTime: '2026-04-27T10:00:00.000Z',
      sortKey: '2026-04-27T09:00:00.000Z',
    });

    expect(isCalendarEventVisibleInWindow(event, now, windowEnd)).toBe(false);
  });

  it('excludes events outside the active window', () => {
    const now = new Date('2026-04-27T12:00:00.000Z');
    const weekWindowEnd = new Date('2026-05-04T12:00:00.000Z');
    const monthWindowEnd = new Date('2026-05-28T12:00:00.000Z');
    const event = createEvent({
      isAllDay: true,
      startDateTime: '2026-06-01T00:00:00.000Z',
      sortKey: '2026-06-01T00:00:00.000Z',
    });

    expect(isCalendarEventVisibleInWindow(event, now, weekWindowEnd)).toBe(false);
    expect(isCalendarEventVisibleInWindow(event, now, monthWindowEnd)).toBe(false);
  });

  it('treats all-day events as active through the local end of day', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-04-27T21:00:00.000Z'));

    const start = new Date('2026-04-27T00:00:00.000Z');
    const { end } = getCalendarEventInterval(
      createEvent({
        isAllDay: true,
        startDateTime: '2026-04-27T00:00:00.000Z',
      })
    );

    expect(end?.getTime()).toBeGreaterThan(start.getTime());

    vi.useRealTimers();
  });
});
