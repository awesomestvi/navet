import { createEmptyDeviceCollection } from '@navet/app/core/navet-device-collections';
import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
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
            {
              id: 'home_assistant:sensor.kitchen_pressure',
              canonicalId: 'home_assistant:sensor.kitchen_pressure',
              nativeId: 'sensor.kitchen_pressure',
              providerId: 'home_assistant',
              name: 'Kitchen Pressure',
              room: 'Kitchen',
              size: 'small',
              value: '14.65606402082003',
              unit: 'psi',
              deviceClass: 'pressure',
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

  it('formats provider sensor readings with the same display precision as single sensor cards', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
      providerDeviceCollectionsByProviderId:
        integrationStore.getState().providerDeviceCollectionsByProviderId,
    });

    const { result } = renderHookWithProviders(() =>
      useProviderInfoWidgetData(['sensor.kitchen_pressure'], {
        includeBinarySensors: true,
        use24HourTime: true,
      })
    );

    expect(result.current.currentSensors).toEqual([
      expect.objectContaining({
        id: 'home_assistant:sensor.kitchen_pressure',
        label: 'Kitchen Pressure',
        value: '14.7',
        unit: 'psi',
      }),
    ]);
  });

  it('defers the full picker catalog and ignores unrelated sensor updates while closed', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
    });

    let renderCount = 0;
    const { result } = renderHookWithProviders(() => {
      renderCount += 1;
      return useProviderInfoWidgetData(['sensor.kitchen_temperature'], {
        includeAvailableSensors: false,
        includeBinarySensors: true,
        use24HourTime: true,
      });
    });

    expect(result.current.availableSensors).toEqual([]);
    expect(result.current.currentSensors).toEqual([
      expect.objectContaining({
        id: 'home_assistant:sensor.kitchen_temperature',
        value: '22.1',
      }),
    ]);

    const collections = integrationStore.getState().providerDeviceCollectionsByProviderId;
    const homeAssistantCollection = collections.home_assistant;
    const selectedSensor = homeAssistantCollection?.sensors[0];
    const unrelatedSensor = homeAssistantCollection?.sensors[1];
    expect(selectedSensor).toBeDefined();
    expect(unrelatedSensor).toBeDefined();
    if (!selectedSensor || !unrelatedSensor) {
      throw new Error('Expected selected and unrelated Home Assistant sensor fixtures');
    }

    act(() => {
      integrationStore.setState({
        providerDeviceCollectionsByProviderId: {
          ...collections,
          home_assistant: {
            ...(homeAssistantCollection ?? createEmptyDeviceCollection()),
            sensors: [
              selectedSensor,
              {
                ...unrelatedSensor,
                value: '15.2',
              },
            ],
          },
        },
      });
    });

    expect(renderCount).toBe(1);

    act(() => {
      integrationStore.setState({
        providerDeviceCollectionsByProviderId: {
          ...collections,
          home_assistant: {
            ...(homeAssistantCollection ?? createEmptyDeviceCollection()),
            sensors: [
              {
                ...selectedSensor,
                value: '22.8',
              },
              unrelatedSensor,
            ],
          },
        },
      });
    });

    expect(renderCount).toBe(2);
    expect(result.current.currentSensors[0]).toEqual(
      expect.objectContaining({
        id: 'home_assistant:sensor.kitchen_temperature',
        value: '22.8',
      })
    );
  });
});
