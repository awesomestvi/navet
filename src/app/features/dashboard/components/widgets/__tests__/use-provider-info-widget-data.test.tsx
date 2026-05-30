import { beforeEach, describe, expect, it } from 'vitest';
import { createEmptyDeviceCollection } from '@/app/core/navet-device-collections';
import { integrationStore } from '@/app/stores/integration-store';
import { renderHookWithProviders } from '@/test/render';
import { useProviderInfoWidgetData } from '../use-provider-info-widget-data';

describe('useProviderInfoWidgetData', () => {
  beforeEach(() => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'homey',
      providerDeviceCollectionsByProviderId: {
        homey: {
          ...createEmptyDeviceCollection(),
          sensors: [
            {
              id: 'homey:ups-1#measure_battery',
              canonicalId: 'homey:ups-1#measure_battery',
              nativeId: 'ups-1#measure_battery',
              providerId: 'homey',
              name: 'UPS Battery',
              room: 'Office',
              size: 'small',
              value: '81',
              unit: '%',
              deviceClass: 'battery',
              sourceDeviceId: 'ups-1',
            },
          ],
        },
        home_assistant: {
          ...createEmptyDeviceCollection(),
          sensors: [
            {
              id: 'home_assistant:sensor.kitchen_temperature',
              canonicalId: 'home_assistant:sensor.kitchen_temperature',
              nativeId: 'sensor.kitchen_temperature',
              providerId: 'home_assistant',
              name: 'Kitchen Temperature',
              room: 'Kitchen',
              size: 'small',
              value: '22.1',
              unit: 'C',
              deviceClass: 'temperature',
            },
          ],
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

  it('resolves legacy Home Assistant native ids to canonical widget selections', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      providerDeviceCollectionsByProviderId:
        integrationStore.getState().providerDeviceCollectionsByProviderId,
    });

    const { result } = renderHookWithProviders(() =>
      useProviderInfoWidgetData(['sensor.kitchen_temperature'], {
        includeBinarySensors: true,
        use24HourTime: true,
      })
    );

    expect(result.current.currentSensors).toEqual([
      expect.objectContaining({
        id: 'home_assistant:sensor.kitchen_temperature',
        label: 'Kitchen Temperature',
        value: '22.1',
        unit: 'C',
      }),
    ]);
  });
});
