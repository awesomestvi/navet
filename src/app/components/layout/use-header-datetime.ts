import { useEffect, useMemo, useState } from 'react';
import { useI18n } from '@/app/hooks';
import type { TranslationKey } from '@/app/i18n';

type GreetingPeriod = 'morning' | 'afternoon' | 'evening' | 'night';

const casualGreetingKeys: TranslationKey[] = [
  'header.greeting.hi',
  'header.greeting.hey',
  'header.greeting.welcome',
];

export function getGreetingPeriod(hour: number): GreetingPeriod {
  if (hour >= 5 && hour < 12) return 'morning';
  if (hour >= 12 && hour < 17) return 'afternoon';
  if (hour >= 17 && hour < 21) return 'evening';
  return 'night';
}

function getPeriodGreetingKey(period: GreetingPeriod): TranslationKey {
  if (period === 'morning') return 'header.greeting.morning';
  if (period === 'afternoon') return 'header.greeting.afternoon';
  if (period === 'evening') return 'header.greeting.evening';
  return 'header.greeting.night';
}

export function getGreetingKey(hour: number): TranslationKey {
  if (Math.random() < 0.25) {
    return casualGreetingKeys[Math.floor(Math.random() * casualGreetingKeys.length)];
  }

  return getPeriodGreetingKey(getGreetingPeriod(hour));
}

function createGreetingState(hour: number) {
  return {
    key: getGreetingKey(hour),
    period: getGreetingPeriod(hour),
  };
}

function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

export function useHeaderDateTime() {
  const { formatDate, formatTime } = useI18n();
  const [currentDateTime, setCurrentDateTime] = useState(() => new Date());
  const [greeting, setGreeting] = useState(() => createGreetingState(new Date().getHours()));

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      const nextDateTime = new Date();
      setCurrentDateTime(nextDateTime);
      setGreeting((currentGreeting) => {
        const nextPeriod = getGreetingPeriod(nextDateTime.getHours());

        if (nextPeriod === currentGreeting.period) {
          return currentGreeting;
        }

        return createGreetingState(nextDateTime.getHours());
      });
    }, 1000 * 30);
    return () => window.clearInterval(intervalId);
  }, []);

  const formattedDate = useMemo(
    () => formatDate(currentDateTime, { weekday: 'short', month: 'long', day: 'numeric' }),
    [currentDateTime, formatDate]
  );

  const formattedTime = useMemo(
    () => formatTime(currentDateTime, { hour: '2-digit', minute: '2-digit' }),
    [currentDateTime, formatTime]
  );

  const weekNumber = useMemo(() => getWeekNumber(currentDateTime), [currentDateTime]);

  return { formattedDate, formattedTime, greetingKey: greeting.key, weekNumber };
}
