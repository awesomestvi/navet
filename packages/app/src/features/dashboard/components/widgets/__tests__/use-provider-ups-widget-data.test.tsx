import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useProviderUpsWidgetData } from '../use-provider-ups-widget-data';

vi.mock('../use-home-assistant-ups-widget-data', () => ({
  useHomeAssistantUpsWidgetData: vi.fn(() => ({
    devices: [],
    entities: null,
    formatOptions: {
      locale: 'en-US',
      use24HourTime: true,
    },
  })),
}));

describe('useProviderUpsWidgetData', () => {
  beforeEach(() => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'homey',
      providerEntitiesByProviderId: {
        homey: {
          'homey:ups-1': {
            id: 'homey:ups-1',
            canonicalId: 'homey:ups-1',
            providerId: 'homey',
            externalId: 'ups-1',
            type: 'switch',
            name: 'UPS Cabinet',
            room: 'Office',
            primaryState: 'on',
            availability: 'available',
            capabilities: [],
            attributes: {
              value: 'on',
            },
          },
          'homey:ups-1#measure_battery': {
            id: 'homey:ups-1#measure_battery',
            canonicalId: 'homey:ups-1#measure_battery',
            providerId: 'homey',
            externalId: 'ups-1#measure_battery',
            type: 'sensor',
            name: 'UPS Battery Charge',
            room: 'Office',
            primaryState: '81',
            availability: 'available',
            capabilities: [],
            attributes: {
              value: '81',
              unit: '%',
              deviceClass: 'battery',
              sourceDeviceId: 'ups-1',
            },
          },
          'homey:ups-1#measure_input_load': {
            id: 'homey:ups-1#measure_input_load',
            canonicalId: 'homey:ups-1#measure_input_load',
            providerId: 'homey',
            externalId: 'ups-1#measure_input_load',
            type: 'sensor',
            name: 'UPS Input Load',
            room: 'Office',
            primaryState: '34',
            availability: 'available',
            capabilities: [],
            attributes: {
              value: '34',
              unit: '%',
              deviceClass: 'power',
              sourceDeviceId: 'ups-1',
            },
          },
          'homey:ups-1#measure_status': {
            id: 'homey:ups-1#measure_status',
            canonicalId: 'homey:ups-1#measure_status',
            providerId: 'homey',
            externalId: 'ups-1#measure_status',
            type: 'sensor',
            name: 'UPS Status',
            room: 'Office',
            primaryState: 'Online',
            availability: 'available',
            capabilities: [],
            attributes: {
              value: 'Online',
              unit: '',
              sourceDeviceId: 'ups-1',
            },
          },
        },
      },
      providerEntityLookupByProviderId: {
        homey: {
          'ups-1': 'homey:ups-1',
          'homey:ups-1': 'homey:ups-1',
          'ups-1#measure_battery': 'homey:ups-1#measure_battery',
          'homey:ups-1#measure_battery': 'homey:ups-1#measure_battery',
          'ups-1#measure_input_load': 'homey:ups-1#measure_input_load',
          'homey:ups-1#measure_input_load': 'homey:ups-1#measure_input_load',
          'ups-1#measure_status': 'homey:ups-1#measure_status',
          'homey:ups-1#measure_status': 'homey:ups-1#measure_status',
        },
      },
      providerDeviceCollectionsByProviderId: {
        homey: {
          ...createEmptyDeviceCollection(),
          sensors: [
            {
              id: 'homey:ups-1#measure_battery',
              canonicalId: 'homey:ups-1#measure_battery',
              nativeId: 'ups-1#measure_battery',
              providerId: 'homey',
              name: 'UPS Battery Charge',
              room: 'Office',
              size: 'small',
              value: '81',
              unit: '%',
              deviceClass: 'battery',
              sourceDeviceId: 'ups-1',
            },
            {
              id: 'homey:ups-1#measure_input_load',
              canonicalId: 'homey:ups-1#measure_input_load',
              nativeId: 'ups-1#measure_input_load',
              providerId: 'homey',
              name: 'UPS Input Load',
              room: 'Office',
              size: 'small',
              value: '34',
              unit: '%',
              deviceClass: 'power',
              sourceDeviceId: 'ups-1',
            },
            {
              id: 'homey:ups-1#measure_status',
              canonicalId: 'homey:ups-1#measure_status',
              nativeId: 'ups-1#measure_status',
              providerId: 'homey',
              name: 'UPS Status',
              room: 'Office',
              size: 'small',
              value: 'Online',
              unit: '',
              sourceDeviceId: 'ups-1',
            },
          ],
        },
      },
    });
  });

  it('builds Homey UPS devices from normalized provider sensors', () => {
    const { result } = renderHookWithProviders(() =>
      useProviderUpsWidgetData({ use24HourTime: true })
    );

    expect(result.current.devices).toEqual([
      expect.objectContaining({
        deviceId: 'homey:ups-1',
        name: 'UPS Cabinet',
        room: 'Office',
        defaultMetricEntityIds: ['homey:ups-1#measure_battery', 'homey:ups-1#measure_input_load'],
        defaultStatusEntityId: 'homey:ups-1#measure_status',
      }),
    ]);
    expect(result.current.entities?.['homey:ups-1#measure_status']).toMatchObject({
      entityId: 'homey:ups-1#measure_status',
      state: 'Online',
      attributes: expect.objectContaining({
        source_device_id: 'ups-1',
      }),
    });
  });

  it('ignores unrelated provider entity updates for Homey UPS output', () => {
    let renderCount = 0;
    const { result } = renderHookWithProviders(() => {
      renderCount += 1;
      return useProviderUpsWidgetData({ use24HourTime: true });
    });

    const initialResult = result.current;

    integrationStore.setState({
      ...integrationStore.getState(),
      providerEntitiesByProviderId: {
        ...integrationStore.getState().providerEntitiesByProviderId,
        homey: {
          ...(integrationStore.getState().providerEntitiesByProviderId.homey ?? {}),
          'homey:light.kitchen': {
            id: 'homey:light.kitchen',
            canonicalId: 'homey:light.kitchen',
            providerId: 'homey',
            externalId: 'light.kitchen',
            type: 'light',
            name: 'Kitchen Light',
            room: 'Kitchen',
            primaryState: 'on',
            availability: 'available',
            capabilities: [],
            attributes: { value: 'on' },
          },
        },
      },
      providerEntityLookupByProviderId: {
        ...integrationStore.getState().providerEntityLookupByProviderId,
        homey: {
          ...(integrationStore.getState().providerEntityLookupByProviderId.homey ?? {}),
          'light.kitchen': 'homey:light.kitchen',
          'homey:light.kitchen': 'homey:light.kitchen',
        },
      },
    });

    expect(renderCount).toBe(1);
    expect(result.current).toBe(initialResult);
  });
});
