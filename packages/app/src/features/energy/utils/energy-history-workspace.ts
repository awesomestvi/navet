import type {
  PlatformStatisticsHistoryPoint,
  PlatformStatisticsHistorySeries,
} from '@navet/app/platform/provider-feature-models';
import type {
  EnergyConsumer,
  EnergyHistoryBucket,
  EnergyHistoryContribution,
  EnergyHistoryRange,
  EnergyHistoryRoomBreakdown,
  EnergyHistoryWindow,
  EnergyHistoryWorkspaceModel,
} from '../types/energy.types';

const HOUR_MS = 60 * 60 * 1000;
const DAY_MS = 24 * HOUR_MS;

function startOfLocalDay(value: Date): Date {
  const next = new Date(value);
  next.setHours(0, 0, 0, 0);
  return next;
}

function addLocalDays(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setDate(next.getDate() + amount);
  return next;
}

function addLocalMonths(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setMonth(next.getMonth() + amount);
  return next;
}

function addLocalYears(value: Date, amount: number): Date {
  const next = new Date(value);
  next.setFullYear(next.getFullYear() + amount);
  return next;
}

function startOfLocalMonth(value: Date): Date {
  const next = startOfLocalDay(value);
  next.setDate(1);
  return next;
}

function startOfLocalYear(value: Date): Date {
  const next = startOfLocalMonth(value);
  next.setMonth(0);
  return next;
}

function isSameLocalDay(left: Date, right: Date) {
  return (
    left.getFullYear() === right.getFullYear() &&
    left.getMonth() === right.getMonth() &&
    left.getDate() === right.getDate()
  );
}

export function resolveEnergyHistoryWindow({
  range,
  now = new Date(),
  referenceDate,
  customStart,
  customEnd,
}: {
  range: EnergyHistoryRange;
  now?: Date;
  referenceDate?: Date;
  customStart?: string;
  customEnd?: string;
}): EnergyHistoryWindow {
  const end = new Date(now);
  const reference = referenceDate && referenceDate < end ? referenceDate : end;
  let start: Date;
  let displayEnd: Date | undefined;

  if (range === 'custom') {
    const parsedStart = customStart ? new Date(`${customStart}T00:00:00`) : new Date(Number.NaN);
    const parsedEnd = customEnd ? new Date(`${customEnd}T23:59:59.999`) : new Date(Number.NaN);
    start = Number.isFinite(parsedStart.getTime())
      ? parsedStart
      : addLocalDays(startOfLocalDay(end), -6);
    if (Number.isFinite(parsedEnd.getTime()) && parsedEnd < end) {
      end.setTime(parsedEnd.getTime());
    }
  } else if (range === 'today') {
    start = startOfLocalDay(reference);
    displayEnd = addLocalDays(start, 1);
    if (!isSameLocalDay(reference, end)) {
      end.setTime(displayEnd.getTime());
    }
  } else if (range === 'week') {
    const referenceDay = startOfLocalDay(reference);
    start = addLocalDays(referenceDay, -6);
    if (!isSameLocalDay(reference, end)) {
      end.setTime(addLocalDays(referenceDay, 1).getTime());
    }
  } else if (range === 'month') {
    start = startOfLocalMonth(reference);
    displayEnd = addLocalMonths(start, 1);
    if (start.getTime() !== startOfLocalMonth(end).getTime()) {
      end.setTime(displayEnd.getTime());
    }
  } else {
    start = startOfLocalYear(reference);
    displayEnd = addLocalYears(start, 1);
    if (start.getTime() !== startOfLocalYear(end).getTime()) {
      end.setTime(displayEnd.getTime());
    }
  }

  if (start >= end && range !== 'month') {
    start = addLocalDays(startOfLocalDay(end), -1);
  }
  const durationMs = end.getTime() - start.getTime();
  const period =
    range === 'month' || range === 'week'
      ? 'day'
      : range === 'year'
        ? 'month'
        : durationMs <= 2 * DAY_MS
          ? 'hour'
          : durationMs <= 90 * DAY_MS
            ? 'day'
            : 'month';
  const previousStart =
    range === 'today'
      ? addLocalDays(start, -1)
      : range === 'week'
        ? addLocalDays(start, -7)
        : range === 'month'
          ? addLocalMonths(start, -1)
          : range === 'year'
            ? addLocalYears(start, -1)
            : new Date(start.getTime() - durationMs);
  const previousEnd =
    range === 'today'
      ? end.getTime() === addLocalDays(start, 1).getTime()
        ? start
        : addLocalDays(end, -1)
      : range === 'week'
        ? start
        : range === 'month'
          ? end.getTime() === displayEnd?.getTime()
            ? start
            : addLocalMonths(end, -1)
          : range === 'year'
            ? end.getTime() === displayEnd?.getTime()
              ? start
              : addLocalYears(end, -1)
            : start;

  return {
    startMs: start.getTime(),
    endMs: end.getTime(),
    ...(displayEnd ? { displayEndMs: displayEnd.getTime() } : {}),
    previousStartMs: previousStart.getTime(),
    previousEndMs: previousEnd.getTime(),
    period,
  };
}

function localDayKey(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`;
}

function localHourKey(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}-${date.getHours()}-${date.getTimezoneOffset()}`;
}

function localMonthKey(timestampMs: number): string {
  const date = new Date(timestampMs);
  return `${date.getFullYear()}-${date.getMonth()}`;
}

export function buildEnergyHistoryBuckets({
  points,
  window,
  valueKind = 'power',
}: {
  points: PlatformStatisticsHistoryPoint[];
  window: EnergyHistoryWindow;
  valueKind?: 'power' | 'energy';
}): EnergyHistoryBucket[] {
  const observedBuckets = points.map((point) => {
    const bucketEnergyKWh = energyKWh(point, valueKind);
    const durationHours = Math.max(0, point.endMs - point.startMs) / HOUR_MS;
    const averagePowerW =
      valueKind === 'energy'
        ? durationHours > 0
          ? (bucketEnergyKWh * 1000) / durationHours
          : 0
        : Math.max(0, point.mean ?? 0);
    return {
      id: `${point.startMs}:${point.endMs}`,
      label: labelForBucket(point, window.period),
      startMs: point.startMs,
      endMs: point.endMs,
      energyKWh: bucketEnergyKWh,
      averagePowerW,
      lowPowerW: valueKind === 'energy' ? averagePowerW : Math.max(0, point.min ?? point.mean ?? 0),
      peakPowerW:
        valueKind === 'energy' ? averagePowerW : Math.max(0, point.max ?? point.mean ?? 0),
      hasData: true,
    } satisfies EnergyHistoryBucket;
  });

  if (!window.displayEndMs) return observedBuckets;

  if (window.period === 'hour') {
    const bucketsByHour = new Map(
      observedBuckets.map((bucket) => [localHourKey(bucket.startMs), bucket] as const)
    );
    const calendarBuckets: EnergyHistoryBucket[] = [];
    let cursor = startOfLocalDay(new Date(window.startMs));
    while (cursor.getTime() < window.displayEndMs) {
      const next = new Date(cursor.getTime() + HOUR_MS);
      const observed = bucketsByHour.get(localHourKey(cursor.getTime()));
      calendarBuckets.push(
        observed ?? {
          id: `empty:${cursor.getTime()}:${next.getTime()}`,
          label: labelForBucket(
            { startMs: cursor.getTime(), endMs: next.getTime() },
            window.period
          ),
          startMs: cursor.getTime(),
          endMs: next.getTime(),
          energyKWh: 0,
          averagePowerW: 0,
          lowPowerW: 0,
          peakPowerW: 0,
          hasData: false,
        }
      );
      cursor = next;
    }
    return calendarBuckets;
  }

  if (window.period === 'month') {
    const bucketsByMonth = new Map(
      observedBuckets.map((bucket) => [localMonthKey(bucket.startMs), bucket] as const)
    );
    const calendarBuckets: EnergyHistoryBucket[] = [];
    let cursor = startOfLocalMonth(new Date(window.startMs));
    while (cursor.getTime() < window.displayEndMs) {
      const next = addLocalMonths(cursor, 1);
      const observed = bucketsByMonth.get(localMonthKey(cursor.getTime()));
      calendarBuckets.push(
        observed ?? {
          id: `empty:${cursor.getTime()}:${next.getTime()}`,
          label: labelForBucket(
            { startMs: cursor.getTime(), endMs: next.getTime() },
            window.period
          ),
          startMs: cursor.getTime(),
          endMs: next.getTime(),
          energyKWh: 0,
          averagePowerW: 0,
          lowPowerW: 0,
          peakPowerW: 0,
          hasData: false,
        }
      );
      cursor = next;
    }
    return calendarBuckets;
  }

  if (window.period !== 'day') return observedBuckets;

  const bucketsByDay = new Map(
    observedBuckets.map((bucket) => [localDayKey(bucket.startMs), bucket] as const)
  );
  const calendarBuckets: EnergyHistoryBucket[] = [];
  let cursor = startOfLocalDay(new Date(window.startMs));
  while (cursor.getTime() < window.displayEndMs) {
    const next = addLocalDays(cursor, 1);
    const observed = bucketsByDay.get(localDayKey(cursor.getTime()));
    calendarBuckets.push(
      observed ?? {
        id: `empty:${cursor.getTime()}:${next.getTime()}`,
        label: labelForBucket({ startMs: cursor.getTime(), endMs: next.getTime() }, window.period),
        startMs: cursor.getTime(),
        endMs: next.getTime(),
        energyKWh: 0,
        averagePowerW: 0,
        lowPowerW: 0,
        peakPowerW: 0,
        hasData: false,
      }
    );
    cursor = next;
  }
  return calendarBuckets;
}

function energyKWh(point: PlatformStatisticsHistoryPoint, valueKind: 'power' | 'energy'): number {
  if (valueKind === 'energy') {
    return Math.max(0, point.change ?? 0);
  }
  return (Math.max(0, point.mean ?? 0) * Math.max(0, point.endMs - point.startMs)) / 3_600_000_000;
}

function labelForBucket(
  point: PlatformStatisticsHistoryPoint,
  period: EnergyHistoryWindow['period']
) {
  const date = new Date(point.startMs);
  if (period === 'hour') {
    return date.toLocaleTimeString(undefined, { hour: '2-digit', minute: '2-digit' });
  }
  if (period === 'month') {
    return date.toLocaleDateString(undefined, { month: 'short', year: '2-digit' });
  }
  return date.toLocaleDateString(undefined, { weekday: 'short', day: 'numeric' });
}

function sumSeriesEnergy(
  points: PlatformStatisticsHistoryPoint[],
  valueKind: 'power' | 'energy' = 'power'
): number {
  return points.reduce((total, point) => total + energyKWh(point, valueKind), 0);
}

function contributionFor(
  consumer: EnergyConsumer,
  points: PlatformStatisticsHistoryPoint[],
  totalEnergyKWh: number
): EnergyHistoryContribution {
  const contributionEnergy = sumSeriesEnergy(points, 'power');
  const durationHours = points.reduce(
    (total, point) => total + Math.max(0, point.endMs - point.startMs) / HOUR_MS,
    0
  );
  return {
    id: consumer.id,
    name: consumer.name,
    ...(consumer.room ? { room: consumer.room } : {}),
    energyKWh: contributionEnergy,
    averagePowerW: durationHours > 0 ? (contributionEnergy * 1000) / durationHours : 0,
    share: totalEnergyKWh > 0 ? contributionEnergy / totalEnergyKWh : 0,
  };
}

export function buildEnergyHistoryWorkspaceModel({
  wholeHomeEntityId,
  consumers,
  series,
  previousSeries,
  window,
  selectedBucketIndex,
  valueKind = 'power',
}: {
  wholeHomeEntityId: string;
  consumers: EnergyConsumer[];
  series: PlatformStatisticsHistorySeries;
  previousSeries?: PlatformStatisticsHistorySeries | null;
  window: EnergyHistoryWindow;
  selectedBucketIndex?: number | null;
  valueKind?: 'power' | 'energy';
}): EnergyHistoryWorkspaceModel {
  const wholeHomePoints = series[wholeHomeEntityId] ?? [];
  const buckets = buildEnergyHistoryBuckets({ points: wholeHomePoints, window, valueKind });
  const observedBuckets = buckets.filter((bucket) => bucket.hasData);
  const totalEnergyKWh = observedBuckets.reduce((total, bucket) => total + bucket.energyKWh, 0);
  const durationHours = observedBuckets.reduce(
    (total, bucket) => total + (bucket.endMs - bucket.startMs) / HOUR_MS,
    0
  );
  const selectedBucket =
    selectedBucketIndex === null || selectedBucketIndex === undefined
      ? null
      : (buckets[selectedBucketIndex] ?? null);

  const windowStart = selectedBucket?.startMs ?? window.startMs;
  const windowEnd = selectedBucket?.endMs ?? window.endMs;
  const effectiveEnergyKWh = selectedBucket?.energyKWh ?? totalEnergyKWh;
  const deviceBreakdown = consumers
    .filter((consumer): consumer is EnergyConsumer & { powerEntityId: string } =>
      Boolean(consumer.powerEntityId)
    )
    .map((consumer) =>
      contributionFor(
        consumer,
        (series[consumer.powerEntityId] ?? []).filter(
          (point) => point.startMs < windowEnd && point.endMs > windowStart
        ),
        effectiveEnergyKWh
      )
    )
    .filter((item) => item.energyKWh > 0)
    .sort((left, right) => right.energyKWh - left.energyKWh);
  const trackedEnergyKWh = deviceBreakdown.reduce((total, item) => total + item.energyKWh, 0);
  const roomMap = new Map<string, EnergyHistoryContribution[]>();
  for (const device of deviceBreakdown) {
    const room = device.room?.trim() || 'Unassigned';
    roomMap.set(room, [...(roomMap.get(room) ?? []), device]);
  }
  const roomBreakdown: EnergyHistoryRoomBreakdown[] = [...roomMap.entries()]
    .map(([name, devices]) => {
      const roomEnergy = devices.reduce((total, device) => total + device.energyKWh, 0);
      return {
        id: name.toLowerCase().replace(/\s+/g, '-'),
        name,
        energyKWh: roomEnergy,
        share: effectiveEnergyKWh > 0 ? roomEnergy / effectiveEnergyKWh : 0,
        devices,
      };
    })
    .sort((left, right) => right.energyKWh - left.energyKWh);
  const previousTotal = previousSeries
    ? sumSeriesEnergy(previousSeries[wholeHomeEntityId] ?? [], valueKind)
    : 0;
  const peakBucket = observedBuckets.reduce<EnergyHistoryBucket | null>(
    (peak, bucket) => (!peak || bucket.peakPowerW > peak.peakPowerW ? bucket : peak),
    null
  );

  return {
    buckets,
    totalEnergyKWh,
    averagePowerW: durationHours > 0 ? (totalEnergyKWh * 1000) / durationHours : 0,
    lowPowerW:
      observedBuckets.length > 0
        ? Math.min(...observedBuckets.map((bucket) => bucket.lowPowerW))
        : 0,
    peakPowerW: peakBucket?.peakPowerW ?? 0,
    ...(peakBucket ? { peakStartMs: peakBucket.startMs, peakEndMs: peakBucket.endMs } : {}),
    ...(previousTotal > 0
      ? { comparisonPercent: (totalEnergyKWh - previousTotal) / previousTotal }
      : {}),
    selectedBucket,
    deviceBreakdown,
    roomBreakdown,
    trackedEnergyKWh,
    untrackedEnergyKWh: Math.max(0, effectiveEnergyKWh - trackedEnergyKWh),
  };
}
