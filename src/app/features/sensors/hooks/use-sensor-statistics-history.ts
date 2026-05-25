import type { HassEntity } from 'home-assistant-js-websocket';
import { useEffect, useMemo, useRef, useState } from 'react';
import { ENERGY_STATISTICS_REFRESH_INTERVAL } from '@/app/constants';
import { useHomeAssistant } from '@/app/hooks';
import { getSensorDeviceClass } from '@/app/hooks/device-mappers';
import {
  getRecorderMeanHistory,
  type RecorderStatisticPoint,
} from '@/app/services/ha-recorder-statistics';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { homeAssistantSelectors } from '@/app/stores/selectors';

const REFRESH_MS = ENERGY_STATISTICS_REFRESH_INTERVAL;
const CACHE_TTL_MS = Math.max(30_000, REFRESH_MS - 1_000);
const historyCache = new Map<string, { expiresAt: number; data: RecorderStatisticPoint[] }>();
const NON_TREND_DEVICE_CLASSES = new Set(['date', 'enum', 'timestamp']);
const NON_TREND_UNITS = new Set(['', '%']);

function getStartOfToday(now: Date) {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

function isNumericSensor(entityId: string, entity: HassEntity | undefined) {
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

export function useSensorStatisticsHistory(entityId: string | undefined) {
  const entity = useHomeAssistant(
    entityId ? homeAssistantSelectors.entity(entityId) : () => undefined
  );
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [points, setPoints] = useState<SensorStatisticsPoint[]>([]);

  const canFetch = useMemo(() => isNumericSensor(entityId ?? '', entity), [entity, entityId]);

  useEffect(() => {
    if (!entityId || !canFetch) {
      setPoints([]);
      return;
    }
    const stableEntityId = entityId;

    async function fetchHistory() {
      const activeConnection = connection ?? homeAssistantService.getConnection();
      if (!activeConnection) {
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
          activeConnection,
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
  }, [canFetch, connection, entityId]);

  return {
    points,
    canFetch,
    hasHistory: points.length >= 2,
  };
}
