import type { PlatformEntityHistorySeries } from '@navet/app/platform/provider-feature-models';
import { getIntegrationEntityHistories } from '@navet/app/services/integration-history.service';
import type { DeviceWithType } from '@navet/app/types/device.types';
import { subscribeVisibilityAwareAsyncTask } from '@navet/app/utils/visibility-aware-scheduler';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  buildCurrentSecurityActivityEvents,
  buildSecurityActivityEvents,
  type SecurityActivityEvent,
} from '../utils/security-activity-history';

const SECURITY_ACTIVITY_REFRESH_MS = 5 * 60 * 1_000;
const SECURITY_ACTIVITY_LOOKBACK_MS = 24 * 60 * 60 * 1_000;
const SECURITY_ACTIVITY_OLDER_PAGE_MS = 7 * SECURITY_ACTIVITY_LOOKBACK_MS;
const SECURITY_ACTIVITY_MAX_LOOKBACK_MS = 30 * SECURITY_ACTIVITY_LOOKBACK_MS;
export const SECURITY_ACTIVITY_EVENT_LIMIT = 200;

function canHaveSecurityHistory(device: DeviceWithType) {
  return (
    device.type !== 'cameras' &&
    device.type !== 'persons' &&
    device.securityKind !== 'camera' &&
    device.securityKind !== 'person' &&
    device.securityKind !== 'deviceTracker'
  );
}

function mergeCurrentAndHistoricalEvents(
  currentEvents: readonly SecurityActivityEvent[],
  historicalEvents: readonly SecurityActivityEvent[]
) {
  const latestHistoryByEntityAndKind = new Map<string, SecurityActivityEvent>();
  for (const event of historicalEvents) {
    const key = `${event.entityId}:${event.kind}`;
    if (!latestHistoryByEntityAndKind.has(key)) {
      latestHistoryByEntityAndKind.set(key, event);
    }
  }

  const enrichedCurrent = currentEvents.map((event) => {
    if (event.timestampMs !== null) {
      return event;
    }
    const matchingHistory = latestHistoryByEntityAndKind.get(`${event.entityId}:${event.kind}`);
    return matchingHistory ? { ...event, timestampMs: matchingHistory.timestampMs } : event;
  });
  const currentKeys = new Set(
    enrichedCurrent.flatMap((event) =>
      event.timestampMs === null
        ? []
        : [`${event.entityId}:${event.kind}:${Math.floor(event.timestampMs / 60_000)}`]
    )
  );

  return [
    ...enrichedCurrent,
    ...historicalEvents.filter(
      (event) =>
        event.timestampMs === null ||
        !currentKeys.has(
          `${event.entityId}:${event.kind}:${Math.floor(event.timestampMs / 60_000)}`
        )
    ),
  ].sort((left, right) => {
    if (left.timestampMs !== right.timestampMs) {
      return (
        (right.timestampMs ?? Number.POSITIVE_INFINITY) -
        (left.timestampMs ?? Number.POSITIVE_INFINITY)
      );
    }
    return left.source === 'current' ? -1 : 1;
  });
}

function mergeHistoricalEvents(
  existingEvents: readonly SecurityActivityEvent[],
  nextEvents: readonly SecurityActivityEvent[]
) {
  const eventsById = new Map(existingEvents.map((event) => [event.id, event]));
  for (const event of nextEvents) {
    eventsById.set(event.id, event);
  }
  return [...eventsById.values()]
    .sort((left, right) => (right.timestampMs ?? 0) - (left.timestampMs ?? 0))
    .slice(0, SECURITY_ACTIVITY_EVENT_LIMIT);
}

async function fetchActivityPage({
  entities,
  endMs,
  lookbackMs,
  signal,
}: {
  entities: readonly DeviceWithType[];
  endMs: number;
  lookbackMs: number;
  signal: AbortSignal;
}) {
  const startMs = endMs - lookbackMs;
  const histories: PlatformEntityHistorySeries[] = await getIntegrationEntityHistories(
    {
      entityIds: entities.map((entity) => entity.id),
      startTime: new Date(startMs).toISOString(),
      endTime: new Date(endMs).toISOString(),
      significantChangesOnly: true,
      signal,
    },
    { requireComplete: true }
  );

  if (histories.length > 0 && histories.length !== entities.length)
    throw new Error('Incomplete security activity history');
  return {
    events: buildSecurityActivityEvents({
      devices: entities,
      histories,
      nowMs: endMs,
      lookbackMs,
    }),
    hasHistoryData: histories.length === entities.length,
    startMs,
  };
}

function canLoadOlderActivity({
  historicalEventCount,
  oldestFetchedMs,
  nowMs,
}: {
  historicalEventCount: number;
  oldestFetchedMs: number;
  nowMs: number;
}) {
  return (
    historicalEventCount < SECURITY_ACTIVITY_EVENT_LIMIT &&
    oldestFetchedMs > nowMs - SECURITY_ACTIVITY_MAX_LOOKBACK_MS
  );
}

export function useSecurityActivityHistory({
  entities,
  currentActivity,
}: {
  entities: readonly DeviceWithType[];
  currentActivity: readonly DeviceWithType[];
}) {
  const currentEvents = useMemo(
    () => buildCurrentSecurityActivityEvents(currentActivity),
    [currentActivity]
  );
  const historyEntities = useMemo(() => entities.filter(canHaveSecurityHistory), [entities]);
  const historyEntityIdsKey = useMemo(
    () =>
      historyEntities
        .map((entity) => entity.id)
        .sort()
        .join('|'),
    [historyEntities]
  );
  const historyEntitiesRef = useRef(historyEntities);
  historyEntitiesRef.current = historyEntities;
  const [historicalEvents, setHistoricalEvents] = useState<SecurityActivityEvent[]>([]);
  const historicalEventsRef = useRef<SecurityActivityEvent[]>([]);
  const [historyAvailable, setHistoryAvailable] = useState(false);
  const [historyError, setHistoryError] = useState<'refresh' | 'older' | null>(null);
  const [lastUpdatedAt, setLastUpdatedAt] = useState<number | null>(null);
  const refreshRef = useRef<() => Promise<void>>(async () => {});
  const retry = useCallback(() => refreshRef.current(), []);
  const [hasMore, setHasMore] = useState(false);
  const [isLoading, setIsLoading] = useState(historyEntities.length > 0);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const oldestFetchedMsRef = useRef<number | null>(null);
  const requestGenerationRef = useRef(0);
  const activeRequestRef = useRef<AbortController | null>(null);

  useEffect(() => {
    if (historyEntityIdsKey.length === 0) {
      setHistoryError(null);
      setLastUpdatedAt(null);
      refreshRef.current = async () => {};
      setHistoricalEvents([]);
      setHistoryAvailable(false);
      setHasMore(false);
      setIsLoading(false);
      setIsLoadingMore(false);
      historicalEventsRef.current = [];
      oldestFetchedMsRef.current = null;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      return;
    }

    let cancelled = false;
    const requestGeneration = requestGenerationRef.current + 1;
    requestGenerationRef.current = requestGeneration;
    activeRequestRef.current?.abort();
    activeRequestRef.current = null;
    setHistoryError(null);
    setLastUpdatedAt(null);
    setHistoricalEvents([]);
    historicalEventsRef.current = [];
    setHistoryAvailable(false);
    setHasMore(false);
    setIsLoading(true);
    setIsLoadingMore(false);
    oldestFetchedMsRef.current = null;

    async function fetchActivity() {
      if (activeRequestRef.current) {
        return;
      }

      const controller = new AbortController();
      activeRequestRef.current = controller;
      const now = Date.now();
      setIsLoading(true);
      try {
        const page = await fetchActivityPage({
          entities: historyEntitiesRef.current,
          endMs: now,
          lookbackMs: SECURITY_ACTIVITY_LOOKBACK_MS,
          signal: controller.signal,
        });

        if (
          controller.signal.aborted ||
          cancelled ||
          requestGenerationRef.current !== requestGeneration
        ) {
          return;
        }

        const isInitialPage = oldestFetchedMsRef.current === null;
        const oldestFetchedMs = Math.min(oldestFetchedMsRef.current ?? page.startMs, page.startMs);
        oldestFetchedMsRef.current = oldestFetchedMs;
        const mergedEvents = mergeHistoricalEvents(historicalEventsRef.current, page.events);
        historicalEventsRef.current = mergedEvents;
        setHistoryAvailable(page.hasHistoryData);
        setHistoryError(null);
        setLastUpdatedAt((updated) => (page.hasHistoryData ? now : updated));
        setHistoricalEvents(mergedEvents);
        setHasMore((hasOlderHistory) =>
          !page.hasHistoryData
            ? false
            : isInitialPage
              ? canLoadOlderActivity({
                  historicalEventCount: mergedEvents.length,
                  oldestFetchedMs,
                  nowMs: now,
                })
              : hasOlderHistory && mergedEvents.length < SECURITY_ACTIVITY_EVENT_LIMIT
        );
      } catch {
        if (
          !controller.signal.aborted &&
          !cancelled &&
          requestGenerationRef.current === requestGeneration
        ) {
          setHistoryError('refresh');
        }
      } finally {
        if (activeRequestRef.current === controller) {
          activeRequestRef.current = null;
        }
        if (!cancelled && requestGenerationRef.current === requestGeneration) {
          setIsLoading(false);
        }
      }
    }

    refreshRef.current = fetchActivity;
    const unsubscribe = subscribeVisibilityAwareAsyncTask(
      fetchActivity,
      SECURITY_ACTIVITY_REFRESH_MS,
      { runImmediately: true }
    );

    return () => {
      cancelled = true;
      refreshRef.current = async () => {};
      requestGenerationRef.current += 1;
      activeRequestRef.current?.abort();
      activeRequestRef.current = null;
      unsubscribe();
    };
  }, [historyEntityIdsKey]);

  const loadMore = useCallback(async () => {
    const endMs = oldestFetchedMsRef.current;
    if (endMs === null || activeRequestRef.current) {
      return;
    }

    const nowMs = Date.now();
    const oldestAllowedMs = nowMs - SECURITY_ACTIVITY_MAX_LOOKBACK_MS;
    const remainingLookbackMs = endMs - oldestAllowedMs;
    if (remainingLookbackMs <= 0) {
      setHasMore(false);
      return;
    }

    const requestGeneration = requestGenerationRef.current;
    const controller = new AbortController();
    activeRequestRef.current = controller;
    setIsLoadingMore(true);

    try {
      const page = await fetchActivityPage({
        entities: historyEntitiesRef.current,
        endMs,
        lookbackMs: Math.min(SECURITY_ACTIVITY_OLDER_PAGE_MS, remainingLookbackMs),
        signal: controller.signal,
      });
      if (controller.signal.aborted || requestGenerationRef.current !== requestGeneration) {
        return;
      }

      if (!page.hasHistoryData) throw new Error('Older activity history unavailable');

      oldestFetchedMsRef.current = page.startMs;
      const mergedEvents = mergeHistoricalEvents(historicalEventsRef.current, page.events);
      historicalEventsRef.current = mergedEvents;
      setHistoryError((error) => (error === 'refresh' ? error : null));
      setHistoryAvailable((available) => available || page.hasHistoryData);
      setHistoricalEvents(mergedEvents);
      setHasMore(
        canLoadOlderActivity({
          historicalEventCount: mergedEvents.length,
          oldestFetchedMs: page.startMs,
          nowMs,
        })
      );
    } catch {
      if (!controller.signal.aborted && requestGenerationRef.current === requestGeneration) {
        setHistoryError((error) => (error === 'refresh' ? error : 'older'));
        setHasMore(true);
      }
    } finally {
      if (requestGenerationRef.current === requestGeneration) {
        setIsLoadingMore(false);
      }
      if (activeRequestRef.current === controller) {
        activeRequestRef.current = null;
      }
    }
  }, []);

  const events = useMemo(
    () =>
      mergeCurrentAndHistoricalEvents(currentEvents, historicalEvents).slice(
        0,
        SECURITY_ACTIVITY_EVENT_LIMIT
      ),
    [currentEvents, historicalEvents]
  );

  return {
    events,
    historyAvailable,
    historyError,
    lastUpdatedAt,
    retry,
    hasMore,
    isLoading,
    isLoadingMore,
    loadMore,
  };
}
