import { renderHook } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProviderWeatherDevices } from '../use-provider-weather-devices';

let mockEntities: Record<string, { state: string; attributes?: Record<string, unknown> }> | null =
  null;
let mockProviderRuntime = {
  connected: true,
  connecting: false,
  reconnecting: false,
  entitiesHydrated: true,
  registriesHydrated: true,
};

vi.mock('@/app/hooks/device-mappers', () => ({
  mapWeatherDevice: vi.fn((id: string, entity: { state: string }, name: string, room: string) => ({
    id,
    name,
    room,
    size: 'medium',
    condition: entity.state,
    temperature: 20,
    forecastMode: 'weekly',
    forecast: [],
  })),
}));

vi.mock('@/app/i18n', () => ({
  useI18n: () => ({
    locale: 'en',
    t: (key: string) => key,
  }),
}));

vi.mock('@/app/services/integration-weather-feature.service', () => ({
  integrationWeatherFeatureService: {
    getForecast: vi.fn().mockResolvedValue([]),
  },
}));

vi.mock('@/app/stores/selectors', () => ({
  settingsSelectors: {
    weatherForecastMode: (state: { weatherForecastMode: string }) => state.weatherForecastMode,
    use24HourTime: (state: { use24HourTime: boolean }) => state.use24HourTime,
  },
}));

vi.mock('@/app/stores/settings-store', () => ({
  useSettingsStore: (
    selector: (state: { weatherForecastMode: string; use24HourTime: boolean }) => unknown
  ) =>
    selector({
      weatherForecastMode: 'weekly',
      use24HourTime: true,
    }),
}));

vi.mock('../use-integration-store', () => ({
  useIntegrationStore: (
    selector: (state: {
      currentProviderId: string;
      providerRuntime: Record<string, typeof mockProviderRuntime>;
      providerEntitiesByCanonicalId: Record<string, { room?: string }>;
    }) => unknown
  ) =>
    selector({
      currentProviderId: 'home_assistant',
      providerRuntime: {
        home_assistant: mockProviderRuntime,
      },
      providerEntitiesByCanonicalId: {},
    }),
}));

vi.mock('../use-provider-entity', () => ({
  useProviderEntityRegistryEntries: () => [],
  useProviderEntitySnapshots: () => mockEntities,
}));

vi.mock('../use-provider-feature-support', () => ({
  useProviderFeature: () => true,
}));

describe('useProviderWeatherDevices', () => {
  beforeEach(() => {
    mockEntities = {
      'weather.home': {
        state: 'sunny',
        attributes: {
          friendly_name: 'Home Weather',
        },
      },
      'sun.sun': {
        state: 'above_horizon',
        attributes: {},
      },
    };
    mockProviderRuntime = {
      connected: true,
      connecting: false,
      reconnecting: false,
      entitiesHydrated: true,
      registriesHydrated: true,
    };
  });

  it('keeps the last resolved weather device while provider entities are rehydrating', () => {
    const { result, rerender } = renderHook(() => useProviderWeatherDevices('home_assistant'));

    expect(result.current).toEqual([
      expect.objectContaining({ id: 'home_assistant:weather.home' }),
    ]);

    mockEntities = null;
    mockProviderRuntime = {
      ...mockProviderRuntime,
      entitiesHydrated: false,
      reconnecting: true,
    };
    rerender();

    expect(result.current).toEqual([
      expect.objectContaining({ id: 'home_assistant:weather.home' }),
    ]);
  });

  it('clears the cached weather device once hydration completes without a weather entity', () => {
    const { result, rerender } = renderHook(() => useProviderWeatherDevices('home_assistant'));

    expect(result.current).toHaveLength(1);

    mockEntities = {};
    mockProviderRuntime = {
      ...mockProviderRuntime,
      entitiesHydrated: true,
      reconnecting: false,
    };
    rerender();

    expect(result.current).toEqual([]);
  });

  it('returns no weather devices when disabled', () => {
    const { result } = renderHook(() =>
      useProviderWeatherDevices('home_assistant', { enabled: false })
    );

    expect(result.current).toEqual([]);
  });
});
