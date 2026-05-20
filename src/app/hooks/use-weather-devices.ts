/**
 * Weather devices hook
 * Handles weather entity mapping and forecast fetching
 */

import type { Connection } from 'home-assistant-js-websocket';
import {
  startTransition,
  useCallback,
  useDeferredValue,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { shallow } from 'zustand/shallow';
import { SUN_ENTITY_ID, WEATHER_FORECAST_REFRESH_INTERVAL } from '@/app/constants';
import { mapWeatherDevice } from '@/app/hooks/ha-device-mappers';
import { getName, resolveEntityRoom } from '@/app/hooks/ha-entity-utils';
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import { useRegistryRoomResolver } from '@/app/hooks/use-registry-device-topology';
import { useI18n } from '@/app/i18n';
import { homeAssistantSelectors, settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { WeatherDevice } from '@/app/types/device.types';
import { haEntityStructureEqual } from '@/app/utils/ha-entity-structure-equal';

type WeatherForecastEntry = Record<string, unknown>;

type WeatherForecastServicePayload = {
  response?: Record<
    string,
    {
      forecast?: WeatherForecastEntry[];
    }
  >;
};

type WeatherForecastServiceEnvelope = WeatherForecastServicePayload & {
  result?: WeatherForecastServicePayload;
};

type WeatherForecastType = 'daily' | 'hourly';

type WeatherForecastState = Record<
  string,
  {
    daily: WeatherForecastEntry[];
    hourly: WeatherForecastEntry[];
  }
>;

async function fetchWeatherForecast(
  connection: Connection,
  entityId: string,
  type: WeatherForecastType
): Promise<WeatherForecastEntry[]> {
  const response = (await connection.sendMessagePromise({
    type: 'call_service',
    domain: 'weather',
    service: 'get_forecasts',
    target: { entity_id: entityId },
    service_data: { type },
    return_response: true,
  })) as WeatherForecastServiceEnvelope;

  return (
    response.response?.[entityId]?.forecast ?? response.result?.response?.[entityId]?.forecast ?? []
  );
}

export function useWeatherDevices(): WeatherDevice[] {
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const config = useHomeAssistant(homeAssistantSelectors.config);
  const entities = useHomeAssistant(homeAssistantSelectors.entities, haEntityStructureEqual);
  const { areaMap, deviceRegistryMap, entityRegistryMap } = useRegistryRoomResolver();
  const { locale, t } = useI18n();
  const weatherForecastMode = useSettingsStore(settingsSelectors.weatherForecastMode);
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);

  const primaryWeatherEntityId = useMemo(() => {
    if (!entities) {
      return null;
    }

    return Object.keys(entities).find((entityId) => entityId.startsWith('weather.')) ?? null;
  }, [entities]);

  const liveWeatherEntity = useHomeAssistant(
    useCallback(
      (state) =>
        primaryWeatherEntityId ? (state.entities?.[primaryWeatherEntityId] ?? null) : null,
      [primaryWeatherEntityId]
    ),
    shallow
  );

  const [weatherForecasts, setWeatherForecasts] = useState<WeatherForecastState>({});
  const deferredWeatherForecasts = useDeferredValue(weatherForecasts);

  useEffect(() => {
    if (!connection || !primaryWeatherEntityId) {
      startTransition(() => {
        setWeatherForecasts({});
      });
      return;
    }

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshForecasts = async () => {
      try {
        const [daily, hourly] = await Promise.all([
          fetchWeatherForecast(connection, primaryWeatherEntityId, 'daily'),
          fetchWeatherForecast(connection, primaryWeatherEntityId, 'hourly'),
        ]);

        if (!cancelled) {
          startTransition(() => {
            setWeatherForecasts((prev) => ({
              ...prev,
              [primaryWeatherEntityId]: { daily, hourly },
            }));
          });
        }
      } catch {
        // Silently fail, keep existing data
      }
    };

    const scheduleRefresh = () => {
      refreshTimer = setTimeout(() => {
        refreshForecasts();
        scheduleRefresh();
      }, WEATHER_FORECAST_REFRESH_INTERVAL);
    };

    refreshForecasts();
    scheduleRefresh();

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [connection, primaryWeatherEntityId]);

  return useMemo(() => {
    if (!entities || !primaryWeatherEntityId) {
      return [];
    }

    const weatherEntity = liveWeatherEntity ?? entities[primaryWeatherEntityId];
    if (!weatherEntity) {
      return [];
    }

    const entityEntry = entityRegistryMap.get(primaryWeatherEntityId);
    const room = resolveEntityRoom(
      primaryWeatherEntityId,
      weatherEntity,
      areaMap,
      entityRegistryMap,
      deviceRegistryMap
    );

    return [
      mapWeatherDevice(
        primaryWeatherEntityId,
        weatherEntity,
        getName(weatherEntity, entityEntry),
        room,
        {
          sunEntity: entities[SUN_ENTITY_ID],
          config,
          weatherForecastMode,
          storedForecasts: deferredWeatherForecasts[primaryWeatherEntityId],
          locale,
          t,
          use24HourTime,
        }
      ),
    ];
  }, [
    areaMap,
    config,
    deferredWeatherForecasts,
    deviceRegistryMap,
    entities,
    entityRegistryMap,
    liveWeatherEntity,
    locale,
    primaryWeatherEntityId,
    t,
    weatherForecastMode,
    use24HourTime,
  ]);
}
