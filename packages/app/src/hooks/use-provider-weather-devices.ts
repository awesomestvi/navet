import { SUN_ENTITY_ID, WEATHER_FORECAST_REFRESH_INTERVAL } from '@navet/app/constants';
import { mapWeatherDevice } from '@navet/app/hooks/device-mappers';
import { useI18n } from '@navet/app/i18n';
import type {
  PlatformWeatherDevice,
  PlatformWeatherForecastEntry,
} from '@navet/app/platform/provider-feature-models';
import { integrationWeatherFeatureService } from '@navet/app/services/integration-weather-feature.service';
import { settingsSelectors } from '@navet/app/stores/selectors';
import { useSettingsStore } from '@navet/app/stores/settings-store';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { UNKNOWN_ROOM_LABEL } from '@navet/app/utils/device-location';
import { createProviderScopedId } from '@navet/app/utils/provider-ids';
import { useCallback, useMemo } from 'react';
import { useIntegrationStore } from './use-integration-store';
import {
  useHydratingProviderCollection,
  useProviderCollectionData,
} from './use-provider-collection-lifecycle';
import {
  useProviderEntityRegistryEntries,
  useProviderEntitySnapshotsByPrefix,
} from './use-provider-entity';
import { useProviderFeature } from './use-provider-feature-support';

const EMPTY_WEATHER_DEVICES: PlatformWeatherDevice[] = [];
const WEATHER_ENTITY_PREFIXES = ['sun.', 'weather.'] as const;

type WeatherForecastState = Record<
  string,
  {
    daily: PlatformWeatherForecastEntry[];
    hourly: PlatformWeatherForecastEntry[];
  }
>;

const EMPTY_WEATHER_FORECASTS: WeatherForecastState = {};
const mergeForecasts = (previous: WeatherForecastState, next: WeatherForecastState) => ({
  ...previous,
  ...next,
});

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
  entityRoom?: string
) {
  return (
    entityRoom ||
    (typeof entity.attributes?.room === 'string' ? entity.attributes.room : null) ||
    (typeof entity.attributes?.area === 'string' ? entity.attributes.area : null) ||
    (typeof entity.attributes?.zone === 'string' ? entity.attributes.zone : null) ||
    UNKNOWN_ROOM_LABEL
  );
}

export function useProviderWeatherDevices(
  providerId?: IntegrationProviderId,
  options?: { enabled?: boolean }
): PlatformWeatherDevice[] {
  const enabled = options?.enabled ?? true;
  const currentProviderId = useIntegrationStore((state) => state.currentProviderId);
  const resolvedProviderId = providerId ?? currentProviderId;
  const entitiesHydrated = useIntegrationStore(
    (state) =>
      (state.providerRuntime[resolvedProviderId] ?? state.providerRuntime[state.currentProviderId])
        .entitiesHydrated
  );
  const supportsWeather = useProviderFeature('weather', resolvedProviderId) && enabled;
  const entities = useProviderEntitySnapshotsByPrefix(WEATHER_ENTITY_PREFIXES, {
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
  const loadForecasts = useCallback(async (): Promise<WeatherForecastState> => {
    if (!primaryWeatherEntityId) return EMPTY_WEATHER_FORECASTS;
    const scopedEntityId = createProviderScopedId(resolvedProviderId, primaryWeatherEntityId);
    const [daily, hourly] = await Promise.all([
      integrationWeatherFeatureService.getForecast(scopedEntityId, 'daily'),
      integrationWeatherFeatureService.getForecast(scopedEntityId, 'hourly'),
    ]);
    return { [primaryWeatherEntityId]: { daily, hourly } };
  }, [resolvedProviderId, primaryWeatherEntityId]);
  const deferredWeatherForecasts = useProviderCollectionData({
    providerId: resolvedProviderId,
    enabled: supportsWeather && primaryWeatherEntityId !== null,
    interval: WEATHER_FORECAST_REFRESH_INTERVAL,
    empty: EMPTY_WEATHER_FORECASTS,
    load: loadForecasts,
    merge: mergeForecasts,
  });

  const resolvedDevices = useMemo(() => {
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
        scopedEntityId,
        weatherEntity,
        resolveEntityName(
          primaryWeatherEntityId,
          weatherEntity,
          entityRegistryMap.get(primaryWeatherEntityId)?.name
        ),
        resolveEntityRoom(scopedEntityId, weatherEntity, undefined),
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
    entities,
    entityRegistryMap,
    locale,
    primaryWeatherEntityId,
    t,
    use24HourTime,
    weatherForecastMode,
  ]);

  return useHydratingProviderCollection(
    resolvedProviderId,
    resolvedDevices,
    supportsWeather,
    entitiesHydrated,
    EMPTY_WEATHER_DEVICES
  );
}

export const useProviderWeatherDevicesCollection = useProviderWeatherDevices;
