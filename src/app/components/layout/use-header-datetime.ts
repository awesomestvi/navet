import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/app/hooks';
import type { TranslationKey } from '@/app/i18n';

function getGreetingKey(hour: number): TranslationKey {
  const casual: TranslationKey[] = [
    'header.greeting.hi',
    'header.greeting.hey',
    'header.greeting.welcome',
  ];
  if (Math.random() < 0.25) {
    return casual[Math.floor(Math.random() * casual.length)];
  }
  if (hour >= 5 && hour < 12) return 'header.greeting.morning';
  if (hour >= 12 && hour < 17) return 'header.greeting.afternoon';
  if (hour >= 17 && hour < 21) return 'header.greeting.evening';
  return 'header.greeting.night';
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function useHeaderDateTime() {
  const { formatDate, formatTime } = useI18n();
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [greetingKey] = useState(() => getGreetingKey(new Date().getHours()));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setCurrentDateTime(new Date());
    }, 1000 * 30);
    return () => window.clearInterval(intervalId);
  }, []);

  const formattedDate = useMemo(
    () => formatDate(currentDateTime, { weekday: 'short', month: 'long', day: 'numeric' }),
    [currentDateTime, formatDate]
  );

  const formattedTime = useMemo(
    () => formatTime(currentDateTime, { hour: '2-digit', minute: '2-digit' }, false),
    [currentDateTime, formatTime]
  );

  const weekNumber = useMemo(() => getWeekNumber(currentDateTime), [currentDateTime]);

  return { formattedDate, formattedTime, greetingKey, weekNumber };
}
