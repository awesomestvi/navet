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
import { useHomeAssistant } from '@/app/hooks/use-home-assistant';
import { useRegistryRoomResolver } from '@/app/hooks/use-registry-device-topology';
import { useI18n } from '@/app/i18n';
import { mapWeatherDevice } from '@/app/infrastructure/home-assistant/home-assistant-device-mappers';
import {
  getName,
  resolveEntityRoom,
} from '@/app/infrastructure/home-assistant/home-assistant-entity-utils';
import type { PlatformWeatherForecastEntry } from '@/app/platform/provider-feature-models';
import { integrationWeatherFeatureService } from '@/app/services/integration-weather-feature.service';
import { homeAssistantSelectors, settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { WeatherDevice } from '@/app/types/device.types';
import { haEntityStructureEqual } from '@/app/utils/ha-entity-structure-equal';

function selectNoConnection() {
  return null;
}

function selectNoConfig() {
  return null;
}

function selectNoEntities() {
  return null;
}

type WeatherForecastState = Record<
  string,
  {
    daily: PlatformWeatherForecastEntry[];
    hourly: PlatformWeatherForecastEntry[];
  }
>;

export function useHomeAssistantWeatherDevices(enabled = true): WeatherDevice[] {
  const connection = useHomeAssistant(
    enabled ? homeAssistantSelectors.connection : selectNoConnection
  );
  const config = useHomeAssistant(enabled ? homeAssistantSelectors.config : selectNoConfig);
  const entities = useHomeAssistant(
    enabled ? homeAssistantSelectors.entities : selectNoEntities,
    haEntityStructureEqual
  );
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
    if (!enabled || !connection || !primaryWeatherEntityId) {
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
          integrationWeatherFeatureService.getForecast(primaryWeatherEntityId, 'daily', {
            messageClient: connection,
          }),
          integrationWeatherFeatureService.getForecast(primaryWeatherEntityId, 'hourly', {
            messageClient: connection,
          }),
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
        // Keep existing data if the refresh fails.
      }
    };

    const scheduleRefresh = () => {
      refreshTimer = setTimeout(() => {
        void refreshForecasts();
        scheduleRefresh();
      }, WEATHER_FORECAST_REFRESH_INTERVAL);
    };

    void refreshForecasts();
    scheduleRefresh();

    return () => {
      cancelled = true;
      if (refreshTimer) {
        clearTimeout(refreshTimer);
      }
    };
  }, [connection, enabled, primaryWeatherEntityId]);

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
