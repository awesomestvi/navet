import type { HomeAssistantEntityRegistryEntry } from '@navet/app/services/home-assistant.service';
import { homeyService } from '@navet/app/services/homey.service';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockProviderConfig =
  | { unit_system?: { temperature?: unknown } }
  | { temperatureUnit?: unknown }
  | null;
type MockEntityMap = Record<
  string,
  {
    state: string;
    attributes?: Record<string, unknown>;
    last_changed?: string;
    last_updated?: string;
  }
>;

const { serviceMock } = vi.hoisted(() => {
  const entityListeners = new Set<() => void>();
  const registryListeners = new Set<() => void>();
  const configListeners = new Set<() => void>();

  return {
    serviceMock: {
      entityListeners,
      registryListeners,
      configListeners,
      addListener: vi.fn((event: 'entities' | 'registries' | 'config', listener: () => void) => {
        const listeners =
          event === 'entities'
            ? entityListeners
            : event === 'registries'
              ? registryListeners
              : configListeners;
        listeners.add(listener);
        return () => listeners.delete(listener);
      }),
      getConfig: vi.fn<() => MockProviderConfig>(() => ({ unit_system: { temperature: 'C' } })),
      getEntities: vi.fn<() => MockEntityMap | null>(() => null),
      getEntityRegistry: vi.fn<() => HomeAssistantEntityRegistryEntry[]>(() => []),
    },
  };
});

vi.mock('@navet/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

import {
  useProviderEntityIdsByPrefix,
  useProviderEntityRegistryEntries,
  useProviderEntityRegistryEntriesByDeviceId,
  useProviderEntityRegistryEntry,
  useProviderEntitySnapshot,
  useProviderEntitySnapshotRecord,
  useProviderTemperatureUnit,
} from '../use-provider-entity';

describe('useProviderEntity hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    homeyService.resetSnapshot();
    serviceMock.entityListeners.clear();
    serviceMock.registryListeners.clear();
    serviceMock.configListeners.clear();
    serviceMock.getEntities.mockReturnValue({
      'light.kitchen': {
        state: 'on',
        attributes: { friendly_name: 'Kitchen Light' },
        last_changed: '2026-05-29T07:00:00.000Z',
        last_updated: '2026-05-29T07:01:00.000Z',
      },
    });
    serviceMock.getEntityRegistry.mockReturnValue([
      {
        entity_id: 'light.kitchen',
        device_id: 'device-kitchen',
        area_id: 'area-kitchen',
        name: 'Kitchen Light',
        platform: 'hue',
      },
      {
        entity_id: 'switch.kitchen_boost',
        device_id: 'device-kitchen',
        area_id: null,
        name: 'Kitchen Boost',
        platform: 'hue',
      },
    ]);
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          'home_assistant:light.kitchen': {
            id: 'home_assistant:light.kitchen',
            canonicalId: 'home_assistant:light.kitchen',
            providerId: 'home_assistant',
            externalId: 'light.kitchen',
            type: 'light',
            name: 'Kitchen Light',
            room: 'Kitchen',
            capabilities: [],
            primaryState: 'on',
            availability: 'available',
            attributes: { value: 'on' },
          },
          'home_assistant:calendar.family': {
            id: 'home_assistant:calendar.family',
            canonicalId: 'home_assistant:calendar.family',
            providerId: 'home_assistant',
            externalId: 'calendar.family',
            type: 'calendar',
            name: 'Family Calendar',
            room: 'Kitchen',
            capabilities: [],
            primaryState: 'on',
            availability: 'available',
            attributes: { value: 'on' },
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          'light.kitchen': 'home_assistant:light.kitchen',
          'home_assistant:light.kitchen': 'home_assistant:light.kitchen',
          'calendar.family': 'home_assistant:calendar.family',
          'home_assistant:calendar.family': 'home_assistant:calendar.family',
        },
      },
    });
  });

  it('reads entity snapshots and registry entries through the provider runtime service', () => {
    const { result: entityResult } = renderHookWithProviders(() =>
      useProviderEntitySnapshot('home_assistant:light.kitchen')
    );
    const { result: registryResult } = renderHookWithProviders(() =>
      useProviderEntityRegistryEntries({ providerId: 'home_assistant' })
    );
    const { result: unitResult } = renderHookWithProviders(() =>
      useProviderTemperatureUnit('home_assistant')
    );

    expect(entityResult.current).toMatchObject({
      entityId: 'light.kitchen',
      state: 'on',
      attributes: { friendly_name: 'Kitchen Light' },
    });
    expect(registryResult.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'light.kitchen',
          deviceId: 'device-kitchen',
          areaId: 'area-kitchen',
          name: 'Kitchen Light',
        }),
      ])
    );
    expect(unitResult.current).toBe('celsius');
    expect(serviceMock.getEntities).toHaveBeenCalled();
    expect(serviceMock.getEntityRegistry).toHaveBeenCalled();
    expect(serviceMock.getConfig).toHaveBeenCalled();
  });

  it('reads Homey entity snapshots and registry entries through the provider runtime service', () => {
    homeyService.replaceSnapshot({
      connected: true,
      zones: {
        zone_living: {
          id: 'zone_living',
          name: 'Living Room',
        },
      },
      devices: {
        'device-1': {
          id: 'device-1',
          name: 'Living Room Sensor',
          zone: 'zone_living',
          capabilitiesObj: {
            measure_temperature: {
              value: 21.5,
              units: 'C',
              title: 'Temperature',
            },
          },
        },
      },
    });
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'homey',
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        homey: {
          'homey:device-1#measure_temperature': {
            id: 'homey:device-1#measure_temperature',
            canonicalId: 'homey:device-1#measure_temperature',
            providerId: 'homey',
            externalId: 'device-1#measure_temperature',
            type: 'sensor',
            name: 'Temperature',
            room: 'Living Room',
            capabilities: [],
            primaryState: '21.5',
            availability: 'available',
            attributes: {
              value: 21.5,
              unit: 'C',
              sourceDeviceId: 'device-1',
              deviceClass: 'temperature',
            },
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        homey: {
          'device-1#measure_temperature': 'homey:device-1#measure_temperature',
          'homey:device-1#measure_temperature': 'homey:device-1#measure_temperature',
        },
      },
    });

    const { result: entityResult } = renderHookWithProviders(() =>
      useProviderEntitySnapshot('homey:device-1#measure_temperature')
    );
    const { result: registryResult } = renderHookWithProviders(() =>
      useProviderEntityRegistryEntries({ providerId: 'homey' })
    );

    expect(entityResult.current).toMatchObject({
      entityId: 'device-1#measure_temperature',
      state: '21.5',
      attributes: expect.objectContaining({
        friendly_name: 'Temperature',
        unit_of_measurement: 'C',
        source_device_id: 'device-1',
      }),
    });
    expect(registryResult.current).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          entityId: 'device-1#measure_temperature',
          deviceId: 'device-1',
          areaId: 'zone_living',
          name: 'Temperature',
        }),
      ])
    );
  });

  it('reads provider-neutral temperature unit fields through the runtime config seam', () => {
    serviceMock.getConfig.mockReturnValue({ temperatureUnit: 'F' });

    const { result } = renderHookWithProviders(() => useProviderTemperatureUnit('home_assistant'));

    expect(result.current).toBe('fahrenheit');
  });

  it('preserves a selected entity snapshot reference when unrelated provider entities update', () => {
    const { result } = renderHookWithProviders(() =>
      useProviderEntitySnapshot('home_assistant:light.kitchen')
    );

    const firstSnapshot = result.current;

    act(() => {
      serviceMock.getEntities.mockReturnValue({
        'light.kitchen': {
          state: 'on',
          attributes: { friendly_name: 'Kitchen Light' },
          last_changed: '2026-05-29T07:00:00.000Z',
          last_updated: '2026-05-29T07:01:00.000Z',
        },
        'light.hall': {
          state: 'off',
          attributes: { friendly_name: 'Hall Light' },
          last_changed: '2026-05-29T07:00:00.000Z',
          last_updated: '2026-05-29T07:01:00.000Z',
        },
      });
      for (const listener of serviceMock.entityListeners) {
        listener();
      }
    });

    expect(result.current).toBe(firstSnapshot);
  });

  it('selects stable provider entity ids by prefix from the integration store', () => {
    const { result, rerender } = renderHookWithProviders(() =>
      useProviderEntityIdsByPrefix(['calendar.'], { providerId: 'home_assistant' })
    );

    const firstIds = result.current;
    expect(firstIds).toEqual(['calendar.family']);

    integrationStore.setState({
      ...integrationStore.getState(),
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        home_assistant: {
          ...integrationStore.getState().providerEntitiesByProviderId.home_assistant,
          'home_assistant:light.hall': {
            id: 'home_assistant:light.hall',
            canonicalId: 'home_assistant:light.hall',
            providerId: 'home_assistant',
            externalId: 'light.hall',
            type: 'light',
            name: 'Hall Light',
            room: 'Hall',
            capabilities: [],
            primaryState: 'off',
            availability: 'available',
            attributes: { value: 'off' },
          },
        },
      },
    });
    rerender();

    expect(result.current).toBe(firstIds);
  });

  it('preserves a selected snapshot record reference when unrelated provider entities update', () => {
    serviceMock.getEntities.mockReturnValue({
      'light.kitchen': {
        state: 'on',
        attributes: { friendly_name: 'Kitchen Light' },
        last_changed: '2026-05-29T07:00:00.000Z',
        last_updated: '2026-05-29T07:01:00.000Z',
      },
      'calendar.family': {
        state: 'on',
        attributes: { friendly_name: 'Family Calendar' },
        last_changed: '2026-05-29T07:00:00.000Z',
        last_updated: '2026-05-29T07:01:00.000Z',
      },
    });

    const { result } = renderHookWithProviders(() =>
      useProviderEntitySnapshotRecord(['calendar.family'], { providerId: 'home_assistant' })
    );
    const firstRecord = result.current;

    act(() => {
      serviceMock.getEntities.mockReturnValue({
        'light.kitchen': {
          state: 'on',
          attributes: { friendly_name: 'Kitchen Light' },
          last_changed: '2026-05-29T07:00:00.000Z',
          last_updated: '2026-05-29T07:01:00.000Z',
        },
        'calendar.family': {
          state: 'on',
          attributes: { friendly_name: 'Family Calendar' },
          last_changed: '2026-05-29T07:00:00.000Z',
          last_updated: '2026-05-29T07:01:00.000Z',
        },
        'light.hall': {
          state: 'off',
          attributes: { friendly_name: 'Hall Light' },
          last_changed: '2026-05-29T07:00:00.000Z',
          last_updated: '2026-05-29T07:01:00.000Z',
        },
      });
      for (const listener of serviceMock.entityListeners) {
        listener();
      }
    });

    expect(result.current).toBe(firstRecord);
  });

  it('reads a single entity registry entry through the provider runtime service', () => {
    const { result } = renderHookWithProviders(() =>
      useProviderEntityRegistryEntry('home_assistant:light.kitchen')
    );

    expect(result.current).toEqual(
      expect.objectContaining({
        entityId: 'light.kitchen',
        deviceId: 'device-kitchen',
        areaId: 'area-kitchen',
      })
    );
  });

  it('preserves device-scoped registry subset references when unrelated registry entries update', () => {
    const { result } = renderHookWithProviders(() =>
      useProviderEntityRegistryEntriesByDeviceId('device-kitchen', {
        providerId: 'home_assistant',
      })
    );
    const firstEntries = result.current;

    act(() => {
      serviceMock.getEntityRegistry.mockReturnValue([
        {
          entity_id: 'light.kitchen',
          device_id: 'device-kitchen',
          area_id: 'area-kitchen',
          name: 'Kitchen Light',
          platform: 'hue',
        },
        {
          entity_id: 'switch.kitchen_boost',
          device_id: 'device-kitchen',
          area_id: null,
          name: 'Kitchen Boost',
          platform: 'hue',
        },
        {
          entity_id: 'light.hall',
          device_id: 'device-hall',
          area_id: 'area-hall',
          name: 'Hall Light',
          platform: 'hue',
        },
      ]);
      for (const listener of serviceMock.registryListeners) {
        listener();
      }
    });

    expect(result.current).toBe(firstEntries);
  });
});
