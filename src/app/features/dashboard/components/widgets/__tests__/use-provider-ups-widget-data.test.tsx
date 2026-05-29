import { beforeEach, describe, expect, it, vi } from 'vitest';
import { integrationStore } from '@/app/stores/integration-store';
import { renderHookWithProviders } from '@/test/render';
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
      devicesByCanonicalId: {
        'homey:ups-1#measure_battery': {
          id: 'homey:ups-1#measure_battery',
          canonicalId: 'homey:ups-1#measure_battery',
          nativeId: 'ups-1#measure_battery',
          providerId: 'homey',
          kind: 'sensor',
          name: 'UPS Battery Charge',
          room: 'Office',
          capabilities: [],
          state: {
            value: '81',
            unit: '%',
            deviceClass: 'battery',
            sourceDeviceId: 'ups-1',
          },
        },
        'homey:ups-1#measure_input_load': {
          id: 'homey:ups-1#measure_input_load',
          canonicalId: 'homey:ups-1#measure_input_load',
          nativeId: 'ups-1#measure_input_load',
          providerId: 'homey',
          kind: 'sensor',
          name: 'UPS Input Load',
          room: 'Office',
          capabilities: [],
          state: {
            value: '34',
            unit: '%',
            deviceClass: 'power',
            sourceDeviceId: 'ups-1',
          },
        },
        'homey:ups-1#measure_status': {
          id: 'homey:ups-1#measure_status',
          canonicalId: 'homey:ups-1#measure_status',
          nativeId: 'ups-1#measure_status',
          providerId: 'homey',
          kind: 'sensor',
          name: 'UPS Status',
          room: 'Office',
          capabilities: [],
          state: {
            value: 'Online',
            unit: '',
            sourceDeviceId: 'ups-1',
          },
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
});
