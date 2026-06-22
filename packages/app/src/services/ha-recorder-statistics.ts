import type { PlatformMessageClient } from '@navet/app/platform/provider-feature-models';

interface StatisticEntry {
  start: string;
  end?: string | number;
  mean?: number;
  min?: number;
  max?: number;
  state?: number;
  sum?: number;
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

export interface RecorderStatisticPoint {
  start: number;
  end: number;
  mean: number;
  min: number;
  max: number;
}

export interface RecorderCumulativeStatisticPoint {
  start: number;
  end: number;
  value: number;
}

export async function getRecorderMeanHistory(
  messageClient: PlatformMessageClient,
  entityId: string,
  startTime: Date,
  endTime = new Date()
): Promise<RecorderStatisticPoint[]> {
  const response = (await messageClient.sendMessagePromise({
    type: 'recorder/statistics_during_period',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    statistic_ids: [entityId],
    period: '5minute',
    types: ['mean', 'min', 'max'],
  })) as StatisticsResponse;

  return (response[entityId] ?? [])
    .map((entry) => ({
      start: normalizeStatisticTimestamp(entry.start),
      end: normalizeStatisticTimestamp(entry.end ?? entry.start),
      mean: typeof entry.mean === 'number' ? entry.mean : 0,
      min: typeof entry.min === 'number' ? entry.min : 0,
      max: typeof entry.max === 'number' ? entry.max : 0,
    }))
    .filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.mean));
}

export async function getRecorderCumulativeHistory(
  messageClient: PlatformMessageClient,
  entityId: string,
  startTime: Date,
  endTime = new Date()
): Promise<RecorderCumulativeStatisticPoint[]> {
  const response = (await messageClient.sendMessagePromise({
    type: 'recorder/statistics_during_period',
    start_time: startTime.toISOString(),
    end_time: endTime.toISOString(),
    statistic_ids: [entityId],
    period: '5minute',
    types: ['state', 'sum'],
  })) as StatisticsResponse;

  return (response[entityId] ?? [])
    .map((entry) => {
      const value =
        typeof entry.state === 'number'
          ? entry.state
          : typeof entry.sum === 'number'
            ? entry.sum
            : Number.NaN;

      return {
        start: normalizeStatisticTimestamp(entry.start),
        end: normalizeStatisticTimestamp(entry.end ?? entry.start),
        value,
      };
    })
    .filter((entry) => Number.isFinite(entry.start) && Number.isFinite(entry.value));
}
