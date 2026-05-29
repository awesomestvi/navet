import { startTransition, useDeferredValue, useEffect, useMemo, useState } from 'react';
import { SUN_ENTITY_ID, WEATHER_FORECAST_REFRESH_INTERVAL } from '@/app/constants';
import { mapWeatherDevice } from '@/app/hooks/device-mappers';
import { useI18n } from '@/app/i18n';
import type {
  PlatformWeatherDevice,
  PlatformWeatherForecastEntry,
} from '@/app/platform/provider-feature-models';
import { integrationWeatherFeatureService } from '@/app/services/integration-weather-feature.service';
import { settingsSelectors } from '@/app/stores/selectors';
import { useSettingsStore } from '@/app/stores/settings-store';
import type { IntegrationProviderId } from '@/app/types/provider';
import { UNKNOWN_ROOM_LABEL } from '@/app/utils/device-location';
import { createProviderScopedId } from '@/app/utils/provider-ids';
import { useIntegrationStore } from './use-integration-store';
import {
  useProviderEntityRegistryEntries,
  useProviderEntitySnapshots,
} from './use-provider-entity';
import { useProviderFeature } from './use-provider-feature-support';

const EMPTY_WEATHER_DEVICES: PlatformWeatherDevice[] = [];

type WeatherForecastState = Record<
  string,
  {
    daily: PlatformWeatherForecastEntry[];
    hourly: PlatformWeatherForecastEntry[];
  }
>;

function resolveEntityName(
  entityId: string,
  entity: { attributes?: Record<string, unknown> },
  entityName?: string | null
) {
  if (typeof entityName === 'string' && entityName.trim().length > 0) {
    return entityName.trim();
  }

  return (
    (typeof entity.attributes?.friendly_name === 'string' && entity.attributes.friendly_name) ||
    entityId ||
    'Unknown'
  );
}

function resolveEntityRoom(
  _scopedEntityId: string,
  entity: { attributes?: Record<string, unknown> },
  deviceRoom?: string
) {
  return (
    deviceRoom ||
    (typeof entity.attributes?.room === 'string' ? entity.attributes.room : null) ||
    (typeof entity.attributes?.area === 'string' ? entity.attributes.area : null) ||
    (typeof entity.attributes?.zone === 'string' ? entity.attributes.zone : null) ||
    UNKNOWN_ROOM_LABEL
  );
}

export function useProviderWeatherDevices(
  providerId?: IntegrationProviderId
): PlatformWeatherDevice[] {
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const resolvedProviderId = providerId ?? currentProviderId;
  const supportsWeather = useProviderFeature('weather', resolvedProviderId);
  const devicesByCanonicalId = useIntegrationStore((state) => state.devicesByCanonicalId);
  const entities = useProviderEntitySnapshots({
    providerId: resolvedProviderId,
    enabled: supportsWeather,
  });
  const entityRegistry = useProviderEntityRegistryEntries({
    providerId: resolvedProviderId,
    enabled: supportsWeather,
  });
  const { locale, t } = useI18n();
  const weatherForecastMode = useSettingsStore(settingsSelectors.weatherForecastMode);
  const use24HourTime = useSettingsStore(settingsSelectors.use24HourTime);

  const primaryWeatherEntityId = useMemo(() => {
    if (!supportsWeather || !entities) {
      return null;
    }

    return Object.keys(entities).find((entityId) => entityId.startsWith('weather.')) ?? null;
  }, [entities, supportsWeather]);

  const entityRegistryMap = useMemo(
    () => new Map(entityRegistry.map((entry) => [entry.entityId, entry])),
    [entityRegistry]
  );
  const [weatherForecasts, setWeatherForecasts] = useState<WeatherForecastState>({});
  const deferredWeatherForecasts = useDeferredValue(weatherForecasts);

  useEffect(() => {
    if (!supportsWeather || !primaryWeatherEntityId) {
      startTransition(() => {
        setWeatherForecasts({});
      });
      return;
    }

    let cancelled = false;
    let refreshTimer: ReturnType<typeof setTimeout> | null = null;

    const refreshForecasts = async () => {
      try {
        const scopedEntityId = createProviderScopedId(resolvedProviderId, primaryWeatherEntityId);
        const [daily, hourly] = await Promise.all([
          integrationWeatherFeatureService.getForecast(scopedEntityId, 'daily'),
          integrationWeatherFeatureService.getForecast(scopedEntityId, 'hourly'),
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
  }, [resolvedProviderId, primaryWeatherEntityId, supportsWeather]);

  return useMemo(() => {
    if (!entities || !primaryWeatherEntityId) {
      return EMPTY_WEATHER_DEVICES;
    }

    const weatherEntity = entities[primaryWeatherEntityId];
    if (!weatherEntity) {
      return EMPTY_WEATHER_DEVICES;
    }

    const scopedEntityId = createProviderScopedId(resolvedProviderId, primaryWeatherEntityId);
    return [
      mapWeatherDevice(
        primaryWeatherEntityId,
        weatherEntity,
        resolveEntityName(
          primaryWeatherEntityId,
          weatherEntity,
          entityRegistryMap.get(primaryWeatherEntityId)?.name
        ),
        resolveEntityRoom(
          scopedEntityId,
          weatherEntity,
          devicesByCanonicalId[scopedEntityId]?.room
        ),
        {
          sunEntity: entities[SUN_ENTITY_ID],
          config: null,
          weatherForecastMode,
          storedForecasts: deferredWeatherForecasts[primaryWeatherEntityId],
          locale,
          t,
          use24HourTime,
        }
      ),
    ];
  }, [
    resolvedProviderId,
    deferredWeatherForecasts,
    devicesByCanonicalId,
    entities,
    entityRegistryMap,
    locale,
    primaryWeatherEntityId,
    t,
    use24HourTime,
    weatherForecastMode,
  ]);
}

export const useProviderWeatherDevicesCollection = useProviderWeatherDevices;
