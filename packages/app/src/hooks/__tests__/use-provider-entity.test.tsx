import type {
  PlatformEntityRegistryEntry,
  PlatformEntitySnapshotMap,
} from '@navet/app/platform/provider-feature-models';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

type MockProviderConfig =
  | { unit_system?: { temperature?: unknown } }
  | { temperatureUnit?: unknown }
  | null;
const { serviceMock } = vi.hoisted(() => {
  const entityListeners = new Set<() => void>();
  const registryListeners = new Set<() => void>();
  const configListeners = new Set<() => void>();

  return {
    serviceMock: {
      entityListeners,
      registryListeners,
      configListeners,
      subscribeEntitySnapshots: vi.fn((listener: () => void) => {
        entityListeners.add(listener);
        return () => entityListeners.delete(listener);
      }),
      subscribeEntityRegistryEntries: vi.fn((listener: () => void) => {
        registryListeners.add(listener);
        return () => registryListeners.delete(listener);
      }),
      subscribeConfig: vi.fn((listener: () => void) => {
        configListeners.add(listener);
        return () => configListeners.delete(listener);
      }),
      getConfig: vi.fn<() => MockProviderConfig>(() => ({ unit_system: { temperature: 'C' } })),
      getEntitySnapshots: vi.fn<() => PlatformEntitySnapshotMap | null>(() => null),
      getEntityRegistryEntries: vi.fn<() => PlatformEntityRegistryEntry[]>(() => []),
    },
  };
});

vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: () => ({ entityRuntimeService: serviceMock }),
}));

import {
  useProviderEntityIdsByPrefix,
  useProviderEntityRegistryEntries,
  useProviderEntityRegistryEntriesByDeviceId,
  useProviderEntityRegistryEntriesByIds,
  useProviderEntityRegistryEntry,
  useProviderEntitySnapshot,
  useProviderEntitySnapshotRecord,
  useProviderEntitySnapshotsByPrefix,
  useProviderTemperatureUnit,
} from '../use-provider-entity';

describe('useProviderEntity hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    serviceMock.entityListeners.clear();
    serviceMock.registryListeners.clear();
    serviceMock.configListeners.clear();
    serviceMock.getConfig.mockReturnValue({ unit_system: { temperature: 'C' } });
    serviceMock.getEntitySnapshots.mockReturnValue({
      'light.kitchen': {
        entityId: 'light.kitchen',
        state: 'on',
        attributes: { friendly_name: 'Kitchen Light' },
        lastChanged: '2026-05-29T07:00:00.000Z',
        lastUpdated: '2026-05-29T07:01:00.000Z',
      },
    });
    serviceMock.getEntityRegistryEntries.mockReturnValue([
      {
        entityId: 'light.kitchen',
        deviceId: 'device-kitchen',
        areaId: 'area-kitchen',
        name: 'Kitchen Light',
        platform: 'hue',
      },
      {
        entityId: 'switch.kitchen_boost',
        deviceId: 'device-kitchen',
        areaId: null,
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
    expect(serviceMock.getEntitySnapshots).toHaveBeenCalled();
    expect(serviceMock.getEntityRegistryEntries).toHaveBeenCalled();
    expect(serviceMock.getConfig).toHaveBeenCalled();
  });

  it('reads Homey entity snapshots and registry entries through the provider runtime service', () => {
    serviceMock.getEntitySnapshots.mockReturnValue({
      'device-1#measure_temperature': {
        entityId: 'device-1#measure_temperature',
        state: '21.5',
        attributes: {
          friendly_name: 'Temperature',
          unit_of_measurement: 'C',
          source_device_id: 'device-1',
        },
      },
    });
    serviceMock.getEntityRegistryEntries.mockReturnValue([
      {
        entityId: 'device-1#measure_temperature',
        deviceId: 'device-1',
        areaId: 'zone_living',
        name: 'Temperature',
        platform: 'homey',
      },
    ]);
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
    if (!firstSnapshot) {
      throw new Error('Expected the selected entity snapshot to be available');
    }

    act(() => {
      serviceMock.getEntitySnapshots.mockReturnValue({
        'light.kitchen': firstSnapshot,
        'light.hall': {
          entityId: 'light.hall',
          state: 'off',
          attributes: { friendly_name: 'Hall Light' },
          lastChanged: '2026-05-29T07:00:00.000Z',
          lastUpdated: '2026-05-29T07:01:00.000Z',
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
    serviceMock.getEntitySnapshots.mockReturnValue({
      'light.kitchen': {
        entityId: 'light.kitchen',
        state: 'on',
        attributes: { friendly_name: 'Kitchen Light' },
        lastChanged: '2026-05-29T07:00:00.000Z',
        lastUpdated: '2026-05-29T07:01:00.000Z',
      },
      'calendar.family': {
        entityId: 'calendar.family',
        state: 'on',
        attributes: { friendly_name: 'Family Calendar' },
        lastChanged: '2026-05-29T07:00:00.000Z',
        lastUpdated: '2026-05-29T07:01:00.000Z',
      },
    });

    const { result } = renderHookWithProviders(() =>
      useProviderEntitySnapshotRecord(['calendar.family'], { providerId: 'home_assistant' })
    );
    const firstRecord = result.current;
    const firstCalendarSnapshot = firstRecord['calendar.family'];
    if (!firstCalendarSnapshot) {
      throw new Error('Expected the calendar snapshot record to be available');
    }

    act(() => {
      serviceMock.getEntitySnapshots.mockReturnValue({
        'light.kitchen': {
          entityId: 'light.kitchen',
          state: 'on',
          attributes: { friendly_name: 'Kitchen Light' },
          lastChanged: '2026-05-29T07:00:00.000Z',
          lastUpdated: '2026-05-29T07:01:00.000Z',
        },
        'calendar.family': firstCalendarSnapshot,
        'light.hall': {
          entityId: 'light.hall',
          state: 'off',
          attributes: { friendly_name: 'Hall Light' },
          lastChanged: '2026-05-29T07:00:00.000Z',
          lastUpdated: '2026-05-29T07:01:00.000Z',
        },
      });
      for (const listener of serviceMock.entityListeners) {
        listener();
      }
    });

    expect(result.current).toBe(firstRecord);
  });

  it('preserves a prefix-filtered snapshot map when another entity domain changes', () => {
    serviceMock.getEntitySnapshots.mockReturnValue({
      'calendar.family': {
        entityId: 'calendar.family',
        state: 'on',
        attributes: { friendly_name: 'Family Calendar' },
      },
      'light.kitchen': {
        entityId: 'light.kitchen',
        state: 'on',
        attributes: { friendly_name: 'Kitchen Light' },
      },
    });

    const { result } = renderHookWithProviders(() =>
      useProviderEntitySnapshotsByPrefix(['calendar.'], { providerId: 'home_assistant' })
    );
    const firstSnapshots = result.current;
    const firstCalendarSnapshot = firstSnapshots['calendar.family'];
    if (!firstCalendarSnapshot) {
      throw new Error('Expected the filtered calendar snapshot to be available');
    }

    act(() => {
      serviceMock.getEntitySnapshots.mockReturnValue({
        'calendar.family': firstCalendarSnapshot,
        'light.kitchen': {
          entityId: 'light.kitchen',
          state: 'off',
          attributes: { friendly_name: 'Kitchen Light' },
        },
      });
      for (const listener of serviceMock.entityListeners) {
        listener();
      }
    });

    expect(result.current).toBe(firstSnapshots);
    expect(result.current).toEqual({
      'calendar.family': expect.objectContaining({ state: 'on' }),
    });
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
      serviceMock.getEntityRegistryEntries.mockReturnValue([
        ...firstEntries,
        {
          entityId: 'light.hall',
          deviceId: 'device-hall',
          areaId: 'area-hall',
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

  it('reads an ordered registry subset from one provider snapshot', () => {
    const { result } = renderHookWithProviders(() =>
      useProviderEntityRegistryEntriesByIds(['switch.kitchen_boost', 'light.kitchen'], {
        providerId: 'home_assistant',
      })
    );

    expect(result.current.map((entry) => entry.entityId)).toEqual([
      'switch.kitchen_boost',
      'light.kitchen',
    ]);
  });
});
