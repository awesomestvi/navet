import type { PlatformMessageClient } from '@navet/app/platform/provider-feature-models';
import { getRecorderMeanHistory } from '@navet/app/services/ha-recorder-statistics';

interface StatisticEntry {
  start: string;
  change?: number;
}

type StatisticsResponse = Record<string, StatisticEntry[]>;

/**
 * Fetches today's energy delta (kWh) for each entity using
 * recorder/statistics_during_period with 5-minute type "change" buckets.
 * Returns 0 for any entity where statistics are unavailable.
 */
export async function getEnergyStatisticsToday(
  messageClient: PlatformMessageClient,
  entityIds: string[]
): Promise<Record<string, number>> {
  if (entityIds.length === 0) return {};

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const response = (await messageClient.sendMessagePromise({
    type: 'recorder/statistics_during_period',
    start_time: startOfToday.toISOString(),
    end_time: now.toISOString(),
    statistic_ids: entityIds,
    period: '5minute',
    types: ['change'],
  })) as StatisticsResponse;

  const result: Record<string, number> = {};
  for (const id of entityIds) {
    result[id] = (response[id] ?? []).reduce((sum, entry) => {
      const change = entry.change;
      return sum + (typeof change === 'number' && change >= 0 ? change : 0);
    }, 0);
  }
  return result;
}

function getStartOfToday(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function getStartOfWeek(now: Date): Date {
  const day = now.getDay();
  const diff = day === 0 ? 6 : day - 1;
  const start = new Date(now);
  start.setDate(now.getDate() - diff);
  start.setHours(0, 0, 0, 0);
  return start;
}

function getStartOfMonth(now: Date): Date {
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

export async function getEnergyStatisticsPeriods(
  messageClient: PlatformMessageClient,
  entityId: string
): Promise<{ today: number; week: number; month: number }> {
  const now = new Date();
  const periods = {
    today: getStartOfToday(now),
    week: getStartOfWeek(now),
    month: getStartOfMonth(now),
  } as const;

  const responses = await Promise.all([
    messageClient.sendMessagePromise({
      type: 'recorder/statistics_during_period',
      start_time: periods.today.toISOString(),
      end_time: now.toISOString(),
      statistic_ids: [entityId],
      period: '5minute',
      types: ['change'],
    }) as Promise<StatisticsResponse>,
    ...[periods.week, periods.month].map(
      (start) =>
        messageClient.sendMessagePromise({
          type: 'recorder/statistics_during_period',
          start_time: start.toISOString(),
          statistic_ids: [entityId],
          period: 'day',
          types: ['change'],
        }) as Promise<StatisticsResponse>
    ),
  ]);

  const [todayResponse, weekResponse, monthResponse] = responses;
  const sumChanges = (response: StatisticsResponse) =>
    (response[entityId] ?? []).reduce((sum, entry) => {
      const change = entry.change;
      return sum + (typeof change === 'number' && change >= 0 ? change : 0);
    }, 0);

  return {
    today: sumChanges(todayResponse),
    week: sumChanges(weekResponse),
    month: sumChanges(monthResponse),
  };
}

export async function getPowerStatisticsHistory(
  messageClient: PlatformMessageClient,
  entityId: string,
  startTime?: Date
): Promise<Array<{ start: number; end: number; mean: number; min: number; max: number }>> {
  const now = new Date();
  const start = startTime ?? getStartOfToday(now);
  return getRecorderMeanHistory(messageClient, entityId, start, now);
}
