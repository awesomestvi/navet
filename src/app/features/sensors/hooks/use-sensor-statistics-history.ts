import { useEffect, useMemo, useRef, useState } from 'react';
import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@/app/constants';
import { useProviderEntitySnapshot } from '@/app/hooks';
import { getSensorDeviceClass } from '@/app/hooks/device-mappers';
import {
  getRecorderMeanHistory,
  type RecorderStatisticPoint,
} from '@/app/services/ha-recorder-statistics';
import { integrationHistoryService } from '@/app/services/integration-history.service';
import { isLegacyHomeAssistantEntityId } from '@/app/utils/provider-entity-id';
import { parseProviderScopedId } from '@/app/utils/provider-ids';

const REFRESH_MS = ENERGY_STATISTICS_REFRESH_INTERVAL;
const CACHE_TTL_MS = Math.max(30_000, REFRESH_MS - 1_000);
const historyCache = new Map<string, { expiresAt: number; data: RecorderStatisticPoint[] }>();
const NON_TREND_DEVICE_CLASSES = new Set(['date', 'enum', 'timestamp']);
const NON_TREND_UNITS = new Set(['', '%']);

function getStartOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isNumericSensor(
  entityId: string,
  entity:
    | {
        state: string;
        attributes?: Record<string, unknown>;
      }
    | undefined
) {
  if (!entityId.startsWith('sensor.') || !entity) {
    return false;
  }

  const deviceClass = getSensorDeviceClass(entity);
  if (deviceClass && NON_TREND_DEVICE_CLASSES.has(deviceClass)) {
    return false;
  }

  const value = Number(entity.state);
  if (!Number.isFinite(value)) {
    return false;
  }

  const unit =
    typeof entity.attributes?.unit_of_measurement === 'string'
      ? entity.attributes.unit_of_measurement
      : typeof entity.attributes?.native_unit_of_measurement === 'string'
        ? entity.attributes.native_unit_of_measurement
        : '';

  return !NON_TREND_UNITS.has(unit);
}

export interface SensorStatisticsPoint {
  value: number;
  timestampMs: number;
  endTimestampMs: number;
  minValue: number;
  maxValue: number;
}

function isHomeAssistantHistoryEntityId(entityId: string | undefined): boolean {
  if (!entityId) {
    return false;
  }

  const scopedId = parseProviderScopedId(entityId);
  if (scopedId) {
    return scopedId.providerId === 'home_assistant';
  }

  return isLegacyHomeAssistantEntityId(entityId);
}

export function useSensorStatisticsHistory(entityId: string | undefined) {
  const isHomeAssistantEntity = isHomeAssistantHistoryEntityId(entityId);
  const entity = useProviderEntitySnapshot(entityId ?? '');
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [points, setPoints] = useState<SensorStatisticsPoint[]>([]);

  const canFetch = useMemo(
    () => isHomeAssistantEntity && isNumericSensor(entityId ?? '', entity),
    [entity, entityId, isHomeAssistantEntity]
  );

  useEffect(() => {
    if (!entityId || !canFetch) {
      setPoints([]);
      return;
    }
    const stableEntityId = entityId;

    async function fetchHistory() {
      const activeMessageClient = integrationHistoryService.getMessageClient();
      if (!activeMessageClient) {
        setPoints([]);
        return;
      }

      const now = Date.now();
      const cached = historyCache.get(stableEntityId);
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
        const data = await getRecorderMeanHistory(
          activeMessageClient,
          stableEntityId,
          getStartOfToday(new Date())
        );
        historyCache.set(stableEntityId, {
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
  }, [canFetch, entityId]);

  return {
    points,
    canFetch,
    hasHistory: points.length >= 2,
  };
}
