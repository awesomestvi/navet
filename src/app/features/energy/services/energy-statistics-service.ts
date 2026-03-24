import type { Connection } from 'home-assistant-js-websocket';

interface StatisticEntry {
  start: string;
  change?: number;
  mean?: number;
  min?: number;
  max?: number;
}

type StatisticsResponse = Record<string, StatisticEntry[]>;

function normalizeStatisticTimestamp(value: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const numericValue = Number(value);
    if (Number.isFinite(numericValue)) {
      return numericValue;
    }

    const parsedValue = Date.parse(value);
    if (Number.isFinite(parsedValue)) {
      return parsedValue;
    }
  }

  return Number.NaN;
}

/**
 * Fetches today's energy delta (kWh) for each entity using
 * recorder/statistics_during_period with period "day" and type "change".
 * Returns 0 for any entity where statistics are unavailable.
 */
export async function getEnergyStatisticsToday(
  connection: Connection,
  entityIds: string[]
): Promise<Record<string, number>> {
  if (entityIds.length === 0) return {};

  const now = new Date();
  const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());

  const response = (await connection.sendMessagePromise({
    type: 'recorder/statistics_during_period',
    start_time: startOfToday.toISOString(),
    statistic_ids: entityIds,
    period: 'day',
    types: ['change'],
  })) as StatisticsResponse;

  const result: Record<string, number> = {};
  for (const id of entityIds) {
    const entry = (response[id] ?? [])[0];
    const change = entry?.change;
    result[id] = typeof change === 'number' && change >= 0 ? change : 0;
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
  connection: Connection,
  entityId: string
): Promise<{ today: number; week: number; month: number }> {
  const now = new Date();
  const periods = {
    today: getStartOfToday(now),
    week: getStartOfWeek(now),
    month: getStartOfMonth(now),
  } as const;

  const responses = await Promise.all(
    Object.values(periods).map(
      (start) =>
        connection.sendMessagePromise({
          type: 'recorder/statistics_during_period',
          start_time: start.toISOString(),
          statistic_ids: [entityId],
          period: 'day',
          types: ['change'],
        }) as Promise<StatisticsResponse>
    )
  );

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
  connection: Connection,
  entityId: string,
  startTime?: Date
): Promise<Array<{ start: number; end: number; mean: number; min: number; max: number }>> {
  const now = new Date();
  const start = startTime ?? getStartOfToday(now);

  const response = (await connection.sendMessagePromise({
    type: 'recorder/statistics_during_period',
    start_time: start.toISOString(),
    end_time: now.toISOString(),
    statistic_ids: [entityId],
    period: '5minute',
    types: ['mean', 'min', 'max'],
  })) as StatisticsResponse;

  return (response[entityId] ?? [])
    .map((entry) => ({
      start: normalizeStatisticTimestamp(entry.start),
      end: normalizeStatisticTimestamp(
        (entry as StatisticEntry & { end?: number | string }).end ?? entry.start
      ),
      mean: typeof entry.mean === 'number' ? entry.mean : 0,
      min: typeof entry.min === 'number' ? entry.min : 0,
      max: typeof entry.max === 'number' ? entry.max : 0,
    }))
    .filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.mean));
}
