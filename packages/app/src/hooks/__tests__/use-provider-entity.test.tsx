import type { HomeAssistantEntityRegistryEntry } from '@navet/app/services/home-assistant.service';
import { homeyService } from '@navet/app/services/homey.service';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
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

const { serviceMock } = vi.hoisted(() => ({
  serviceMock: {
    addListener: vi.fn(() => () => {}),
    getConfig: vi.fn<() => MockProviderConfig>(() => ({ unit_system: { temperature: 'C' } })),
    getEntities: vi.fn<() => MockEntityMap | null>(() => null),
    getEntityRegistry: vi.fn<() => HomeAssistantEntityRegistryEntry[]>(() => []),
  },
}));

vi.mock('@navet/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

import {
  useProviderEntityRegistryEntries,
  useProviderEntitySnapshot,
  useProviderTemperatureUnit,
} from '../use-provider-entity';

describe('useProviderEntity hooks', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    homeyService.resetSnapshot();
    serviceMock.addListener.mockImplementation(() => () => {});
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
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        home_assistant: {
          'light.kitchen': 'home_assistant:light.kitchen',
          'home_assistant:light.kitchen': 'home_assistant:light.kitchen',
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
    expect(registryResult.current).toEqual([
      expect.objectContaining({
        entityId: 'light.kitchen',
        deviceId: 'device-kitchen',
        areaId: 'area-kitchen',
        name: 'Kitchen Light',
      }),
    ]);
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
});
