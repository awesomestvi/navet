export interface CalendarEvent {
  id: string;
  title: string;
  startTime: string;
  endTime: string;
  timeDisplay: string;
  startDateTime?: string;
  endDateTime?: string;
  isAllDay?: boolean;
  location?: string;
  description?: string;
  type: 'meeting' | 'call' | 'event';
  color: string;
  attendees?: number;
  sortKey?: string;
  sourceId?: string;
  sourceName?: string;
}

export interface CalendarEventGroup {
  key: string;
  date: Date | null;
  events: CalendarEvent[];
}
