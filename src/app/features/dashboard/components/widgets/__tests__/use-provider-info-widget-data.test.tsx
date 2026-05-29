import { beforeEach, describe, expect, it } from 'vitest';
import { integrationStore } from '@/app/stores/integration-store';
import { renderHookWithProviders } from '@/test/render';
import { useProviderInfoWidgetData } from '../use-provider-info-widget-data';

describe('useProviderInfoWidgetData', () => {
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
          name: 'UPS Battery',
          room: 'Office',
          capabilities: [],
          state: {
            value: '81',
            unit: '%',
            deviceClass: 'battery',
            sourceDeviceId: 'ups-1',
          },
        },
        'home_assistant:sensor.kitchen_temperature': {
          id: 'home_assistant:sensor.kitchen_temperature',
          canonicalId: 'home_assistant:sensor.kitchen_temperature',
          nativeId: 'sensor.kitchen_temperature',
          providerId: 'home_assistant',
          kind: 'sensor',
          name: 'Kitchen Temperature',
          room: 'Kitchen',
          capabilities: [],
          state: {
            value: '22.1',
            unit: 'C',
            deviceClass: 'temperature',
          },
        },
      },
    });
  });

  it('returns Homey sensor options and readings using provider-scoped ids', () => {
    const { result } = renderHookWithProviders(() =>
      useProviderInfoWidgetData(['homey:ups-1#measure_battery'], {
        includeBinarySensors: true,
        use24HourTime: true,
      })
    );

    expect(result.current.availableSensors).toEqual([
      expect.objectContaining({
        id: 'homey:ups-1#measure_battery',
        label: 'UPS Battery',
        room: 'Office',
      }),
    ]);
    expect(result.current.currentSensors).toEqual([
      expect.objectContaining({
        id: 'homey:ups-1#measure_battery',
        label: 'UPS Battery',
        value: '81',
        unit: '%',
      }),
    ]);
  });

  it('still resolves legacy Home Assistant native ids from normalized provider data', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      devicesByCanonicalId: integrationStore.getState().devicesByCanonicalId,
    });

    const { result } = renderHookWithProviders(() =>
      useProviderInfoWidgetData(['sensor.kitchen_temperature'], {
        includeBinarySensors: true,
        use24HourTime: true,
      })
    );

    expect(result.current.currentSensors).toEqual([
      expect.objectContaining({
        id: 'sensor.kitchen_temperature',
        label: 'Kitchen Temperature',
        value: '22.1',
        unit: 'C',
      }),
    ]);
  });
});
