import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@navet/app/constants';
import { useProviderEntitySnapshot } from '@navet/app/hooks';
import { getSensorDeviceClass } from '@navet/app/hooks/device-mappers';
import {
  getRecorderCumulativeHistory,
  getRecorderMeanHistory,
  type RecorderStatisticPoint,
} from '@navet/app/services/ha-recorder-statistics';
import {
  getIntegrationHistoryMessageClient,
  supportsIntegrationStatisticsHistory,
} from '@navet/app/services/integration-history.service';
import { getNativeIntegrationEntityId } from '@navet/app/services/integration-provider-context.service';
import { useEffect, useMemo, useRef, useState } from 'react';

const REFRESH_MS = ENERGY_STATISTICS_REFRESH_INTERVAL;
const CACHE_TTL_MS = Math.max(30_000, REFRESH_MS - 1_000);
const historyCache = new Map<string, { expiresAt: number; data: RecorderStatisticPoint[] }>();
const NON_TREND_DEVICE_CLASSES = new Set(['date', 'enum', 'timestamp']);
const NON_TREND_UNITS = new Set(['', '%']);

function getStartOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

type SensorHistoryMode = 'mean' | 'cumulative';

function getSensorHistoryMode(
  entityId: string,
  entity:
    | {
        state: string;
        attributes?: Record<string, unknown>;
      }
    | undefined
): SensorHistoryMode | null {
  const nativeEntityId = getNativeIntegrationEntityId(entityId);

  if (!nativeEntityId.startsWith('sensor.') || !entity) {
    return null;
  }

  const deviceClass = getSensorDeviceClass(entity);
  if (deviceClass && NON_TREND_DEVICE_CLASSES.has(deviceClass)) {
    return null;
  }

  const stateClass =
    typeof entity.attributes?.state_class === 'string' ? entity.attributes.state_class : undefined;

  const value = Number(entity.state);
  if (!Number.isFinite(value)) {
    return null;
  }

  const unit =
    typeof entity.attributes?.unit_of_measurement === 'string'
      ? entity.attributes.unit_of_measurement
      : typeof entity.attributes?.native_unit_of_measurement === 'string'
        ? entity.attributes.native_unit_of_measurement
        : '';

  if (NON_TREND_UNITS.has(unit)) {
    return null;
  }

  if (stateClass === 'total' || stateClass === 'total_increasing') {
    return 'cumulative';
  }

  return 'mean';
}

export interface SensorStatisticsPoint {
  value: number;
  timestampMs: number;
  endTimestampMs: number;
  minValue: number;
  maxValue: number;
}

export function useSensorStatisticsHistory(entityId: string | undefined) {
  const entity = useProviderEntitySnapshot(entityId ?? '');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [points, setPoints] = useState<SensorStatisticsPoint[]>([]);
  const nativeEntityId = useMemo(
    () => (entityId ? getNativeIntegrationEntityId(entityId) : undefined),
    [entityId]
  );
  const historyMode = useMemo(
    () => getSensorHistoryMode(entityId ?? '', entity),
    [entity, entityId]
  );

  const canFetch = useMemo(
    () => supportsIntegrationStatisticsHistory(entityId) && historyMode !== null,
    [entityId, historyMode]
  );

  useEffect(() => {
    if (!entityId || !canFetch) {
      setPoints([]);
      return;
    }
    const stableEntityId = entityId;
    const stableNativeEntityId = nativeEntityId;

    async function fetchHistory() {
      const activeMessageClient = getIntegrationHistoryMessageClient(stableEntityId);
      if (!activeMessageClient || !stableNativeEntityId) {
        setPoints([]);
        return;
      }

      const now = Date.now();
      const cacheKey = `${stableNativeEntityId}:${historyMode ?? 'none'}`;
      const cached = historyCache.get(cacheKey);
      if (cached && cached.expiresAt > now) {
        setPoints(
          cached.data.map((entry) => ({
            value: entry.mean,
            timestampMs: entry.start,
            endTimestampMs: entry.end,
            minValue: entry.min,
            maxValue: entry.max,
          }))
        );
        return;
      }

      try {
        const data =
          historyMode === 'cumulative'
            ? (
                await getRecorderCumulativeHistory(
                  activeMessageClient,
                  stableNativeEntityId,
                  getStartOfToday(new Date())
                )
              ).map((entry) => ({
                start: entry.start,
                end: entry.end,
                mean: entry.value,
                min: entry.value,
                max: entry.value,
              }))
            : await getRecorderMeanHistory(
                activeMessageClient,
                stableNativeEntityId,
                getStartOfToday(new Date())
              );
        historyCache.set(cacheKey, {
          expiresAt: now + CACHE_TTL_MS,
          data,
        });
        setPoints(
          data.map((entry) => ({
            value: entry.mean,
            timestampMs: entry.start,
            endTimestampMs: entry.end,
            minValue: entry.min,
            maxValue: entry.max,
          }))
        );
      } catch (error) {
        console.error('[SensorStatisticsHistory] Failed to fetch history:', error);
        setPoints([]);
      }
    }

    void fetchHistory();
    timerRef.current = setInterval(() => void fetchHistory(), REFRESH_MS);

    return () => {
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [canFetch, entityId, historyMode, nativeEntityId]);

  return {
    points,
    canFetch,
    hasHistory: points.length >= 2,
  };
}
