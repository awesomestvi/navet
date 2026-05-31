/**
 * Calendar utilities
 */

export function parseCalendarDate(value: unknown): Date | null {
  if (typeof value === 'string' && value) {
    const parsed = new Date(value);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    const raw = record.dateTime ?? record.date;
    if (typeof raw === 'string' && raw) {
      const parsed = new Date(raw);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
  }
  return null;
}

export function isAllDayCalendarValue(value: unknown): boolean {
  if (typeof value === 'string' && value) return /^\d{4}-\d{2}-\d{2}$/.test(value);
  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    return typeof record.date === 'string' && record.date.length > 0;
  }
  return false;
}

export function formatCalendarTime(
  date: Date | null,
  locale: string,
  use24HourTime = false
): string {
  if (!date) return '--';
  const timeFormatterByLocale = new Map<string, Intl.DateTimeFormat>();
  const formatterKey = `${locale}:${use24HourTime ? '24' : '12'}`;
  let formatter = timeFormatterByLocale.get(formatterKey);
  if (!formatter) {
    formatter = new Intl.DateTimeFormat(locale, {
      hour: 'numeric',
      minute: '2-digit',
      hour12: !use24HourTime,
    });
    timeFormatterByLocale.set(formatterKey, formatter);
  }
  return formatter.format(date);
}

export function inferCalendarEventType(title: string, location?: string) {
  const searchText = `${title} ${location ?? ''}`.toLowerCase();

  if (
    searchText.includes('zoom') ||
    searchText.includes('meet') ||
    searchText.includes('teams') ||
    searchText.includes('call') ||
    searchText.includes('video')
  ) {
    return 'call' as const;
  }

  if (
    searchText.includes('meeting') ||
    searchText.includes('standup') ||
    searchText.includes('review') ||
    searchText.includes('sync')
  ) {
    return 'meeting' as const;
  }

  return 'event' as const;
}
