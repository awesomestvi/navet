/**
 * Weather and clock formatting utilities
 */

const timeFormatterByLocale = new Map<string, Intl.DateTimeFormat>();

function getTimeFormatter(locale: string, use24HourTime = false): Intl.DateTimeFormat {
  const formatterKey = `${locale}:${use24HourTime ? '24' : '12'}`;
  const existing = timeFormatterByLocale.get(formatterKey);
  if (existing) {
    return existing;
  }

  const formatter = new Intl.DateTimeFormat(locale, {
    hour: 'numeric',
    minute: '2-digit',
    hour12: !use24HourTime,
  });
  timeFormatterByLocale.set(formatterKey, formatter);
  return formatter;
}

export function formatClock(value: unknown, locale: string, use24HourTime = false): string {
  if (typeof value !== 'string' || !value) return '--';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return getTimeFormatter(locale, use24HourTime).format(date);
}

export function formatTimestampTime(value: unknown, locale: string, use24HourTime = false): string {
  return formatClock(value, locale, use24HourTime);
}

export function formatDaylight(sunrise: unknown, sunset: unknown): string {
  if (typeof sunrise !== 'string' || typeof sunset !== 'string') return '--';
  const sunriseDate = new Date(sunrise);
  const sunsetDate = new Date(sunset);
  if (Number.isNaN(sunriseDate.getTime()) || Number.isNaN(sunsetDate.getTime())) return '--';
  const diffMs = Math.max(0, sunsetDate.getTime() - sunriseDate.getTime());
  const hours = Math.floor(diffMs / 3_600_000);
  const minutes = Math.round((diffMs % 3_600_000) / 60_000);
  return `${hours} h ${minutes} m`;
}
