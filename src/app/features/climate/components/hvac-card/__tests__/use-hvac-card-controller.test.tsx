import { act } from '@testing-library/react';
import type { HassConfig } from 'home-assistant-js-websocket';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { climateEntityFactory } from '@/test/fixtures/home-assistant/entities/climate';
import { renderHookWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';

const { runActionMock, serviceMock } = vi.hoisted(() => ({
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
  serviceMock: {
    callService: vi.fn().mockResolvedValue(undefined),
    setClimateHvacMode: vi.fn().mockResolvedValue(undefined),
    setClimateTemperature: vi.fn().mockResolvedValue(undefined),
  },
}));

vi.mock('@/app/hooks', async () => {
  const actual = await vi.importActual<typeof import('@/app/hooks')>('@/app/hooks');

  return {
    ...actual,
    useHvacRegistryDeviceTopology: () => ({ deviceId: null, siblingIds: [] }),
    useServiceActionHandler: () => runActionMock,
  };
});

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: serviceMock,
}));

import { homeAssistantStore } from '@/app/stores/home-assistant-store';
import { useSettingsStore } from '@/app/stores/settings-store';
import { useHVACCardController } from '../use-hvac-card-controller';

function createClimateEntity(attributes: Record<string, unknown>, state = 'heat') {
  const entity = climateEntityFactory(attributes);
  entity.entity_id = 'climate.hallway';
  entity.state = state;
  if (
    ('target_temp_low' in attributes || 'target_temp_high' in attributes) &&
    !('temperature' in attributes)
  ) {
    delete (entity.attributes as Record<string, unknown>).temperature;
  }
  return entity;
}

describe('useHVACCardController', () => {
  beforeEach(async () => {
    await resetAppStores();
    vi.clearAllMocks();
    useSettingsStore.setState({ temperatureUnit: 'fahrenheit' });
  });

  afterEach(() => {
    vi.useRealTimers();
  });

  it('does not double-convert Fahrenheit source temperatures for display or service calls', async () => {
    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'climate.hallway',
        name: 'Hallway',
        initialTemp: 72,
        initialCurrentTemp: 70,
        sourceTemperatureUnit: 'fahrenheit',
        initialMode: 'heat',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );

    expect(result.current.displayTargetTemp).toBe(72);
    expect(result.current.displayCurrentTemp).toBe(70);
    expect(result.current.formatTemperature(result.current.targetTemp)).toBe('72°F');

    await act(async () => {
      result.current.commitDisplayTargetTemp(73);
    });

    expect(serviceMock.setClimateTemperature).toHaveBeenCalledWith('climate.hallway', 73);
  });

  it('uses the live entity temperature unit when the initial card props omit it', async () => {
    homeAssistantStore.setState({
      entities: {
        'climate.hallway': createClimateEntity({
          temperature: 72,
          current_temperature: 70,
          temperature_unit: '°F',
        }),
      },
    });

    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'climate.hallway',
        name: 'Hallway',
        initialTemp: 21,
        initialCurrentTemp: 20,
        initialMode: 'heat',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );

    expect(result.current.sourceTemperatureUnit).toBe('fahrenheit');
    expect(result.current.displayTargetTemp).toBe(72);
    expect(result.current.displayCurrentTemp).toBe(70);
    expect(result.current.formatTemperature(result.current.targetTemp)).toBe('72°F');

    await act(async () => {
      result.current.commitDisplayTargetTemp(73);
    });

    expect(serviceMock.setClimateTemperature).toHaveBeenCalledWith('climate.hallway', 73);
  });

  it('falls back to the Home Assistant config temperature unit when the entity omits it', async () => {
    homeAssistantStore.setState({
      config: {
        unit_system: {
          temperature: '°F',
        },
      } as HassConfig,
      entities: {
        'climate.hallway': createClimateEntity({
          temperature: 72,
          current_temperature: 70,
        }),
      },
    });

    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'climate.hallway',
        name: 'Hallway',
        initialTemp: 21,
        initialCurrentTemp: 20,
        initialMode: 'heat',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );

    expect(result.current.sourceTemperatureUnit).toBe('fahrenheit');
    expect(result.current.displayTargetTemp).toBe(72);
    expect(result.current.displayCurrentTemp).toBe(70);
    expect(result.current.formatTemperature(result.current.targetTemp)).toBe('72°F');

    await act(async () => {
      result.current.commitDisplayTargetTemp(73);
    });

    expect(serviceMock.setClimateTemperature).toHaveBeenCalledWith('climate.hallway', 73);
  });

  it('syncs numeric string temperatures from live Home Assistant entities', () => {
    homeAssistantStore.setState({
      entities: {
        'climate.hallway': createClimateEntity({
          temperature: '21.5',
          current_temperature: '20.25',
          temperature_unit: '°C',
        }),
      },
    });

    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'climate.hallway',
        name: 'Hallway',
        initialTemp: 18,
        initialCurrentTemp: 18,
        initialMode: 'heat',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );

    expect(result.current.targetTemp).toBe(21.5);
    expect(result.current.currentTemp).toBe(20.25);
  });

  it('syncs Nest-style heat-cool target range temperatures from live entities', () => {
    homeAssistantStore.setState({
      entities: {
        'climate.hallway': createClimateEntity(
          {
            current_temperature: 23,
            target_temp_low: 20,
            target_temp_high: 24,
            hvac_action: 'cooling',
            hvac_modes: ['heat', 'cool', 'heat_cool', 'off'],
            temperature_unit: '°C',
          },
          'heat_cool'
        ),
      },
    });

    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'climate.hallway',
        name: 'Hallway',
        initialTemp: 0,
        initialCurrentTemp: 0,
        initialMode: 'heat_cool',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );

    expect(result.current.targetTemp).toBe(24);
    expect(result.current.currentTemp).toBe(23);
    expect(result.current.mode).toBe('heat_cool');
    expect(result.current.visualMode).toBe('cool');
  });

  it('commits Nest-style cooling changes through target_temp_high', async () => {
    homeAssistantStore.setState({
      entities: {
        'climate.hallway': createClimateEntity(
          {
            current_temperature: 23,
            target_temp_low: 20,
            target_temp_high: 24,
            hvac_action: 'cooling',
            hvac_modes: ['heat', 'cool', 'heat_cool', 'off'],
            temperature_unit: '°C',
          },
          'heat_cool'
        ),
      },
    });

    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'climate.hallway',
        name: 'Hallway',
        initialTemp: 24,
        initialCurrentTemp: 23,
        initialMode: 'heat_cool',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );

    await act(async () => {
      result.current.commitTargetTemp(25);
    });

    expect(serviceMock.callService).toHaveBeenCalledWith(
      'climate',
      'set_temperature',
      { target_temp_high: 25 },
      { entity_id: 'climate.hallway' }
    );
    expect(serviceMock.setClimateTemperature).not.toHaveBeenCalled();
  });

  it('treats the entity state as the canonical live HVAC mode', () => {
    homeAssistantStore.setState({
      entities: {
        'climate.hallway': createClimateEntity(
          {
            temperature: 21,
            current_temperature: 20,
            hvac_mode: 'heat',
          },
          'cool'
        ),
      },
    });

    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'climate.hallway',
        name: 'Hallway',
        initialTemp: 18,
        initialCurrentTemp: 18,
        initialMode: 'heat',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );

    expect(result.current.mode).toBe('cool');

    act(() => {
      homeAssistantStore.setState({
        entities: {
          'climate.hallway': createClimateEntity(
            {
              temperature: 21,
              current_temperature: 20,
              hvac_mode: 'cool',
            },
            'heat'
          ),
        },
      });
    });

    expect(result.current.mode).toBe('heat');
  });

  it('reconciles a clamped Home Assistant target temperature after the pending echo window', async () => {
    vi.useFakeTimers();
    homeAssistantStore.setState({
      entities: {
        'climate.hallway': createClimateEntity({
          temperature: 21,
          current_temperature: 20,
          temperature_unit: '°C',
        }),
      },
    });

    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'climate.hallway',
        name: 'Hallway',
        initialTemp: 21,
        initialCurrentTemp: 20,
        initialMode: 'heat',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );

    await act(async () => {
      result.current.commitTargetTemp(21.5);
    });

    expect(result.current.targetTemp).toBe(21.5);

    act(() => {
      homeAssistantStore.setState({
        entities: {
          'climate.hallway': createClimateEntity({
            temperature: 21,
            current_temperature: 20,
            temperature_unit: '°C',
          }),
        },
      });
    });

    expect(result.current.targetTemp).toBe(21.5);

    act(() => {
      vi.advanceTimersByTime(1500);
    });

    expect(result.current.targetTemp).toBe(21);
  });

  it('opens controls instead of locally toggling HVAC state in toggle-first mode', () => {
    useSettingsStore.setState({ entityInteractionMode: 'toggle-first' });
    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'climate.hallway',
        name: 'Hallway',
        initialTemp: 21,
        initialCurrentTemp: 20,
        initialMode: 'cool',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );
    const cardElement = document.createElement('div');

    act(() => {
      result.current.cardInteraction.cardProps.onClick?.({
        currentTarget: cardElement,
        target: cardElement,
      } as never);
    });

    expect(result.current.isOn).toBe(true);
    expect(result.current.isSettingsOpen).toBe(true);
  });

  it('renders active water heater operating modes with the heat visual tone', () => {
    const { result } = renderHookWithProviders(() =>
      useHVACCardController({
        id: 'water_heater.boiler',
        name: 'Boiler',
        initialTemp: 48,
        initialCurrentTemp: 48,
        initialMode: 'eco',
        initialState: true,
        isEditMode: false,
        size: 'medium',
      })
    );

    expect(result.current.mode).toBe('eco');
    expect(result.current.visualMode).toBe('heat');
  });
});
