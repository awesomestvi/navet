import { act } from '@testing-library/react';
import type { HassConfig, HassEntity } from 'home-assistant-js-websocket';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';
import { resetAppStores } from '@/test/store-reset';

const { runActionMock, serviceMock } = vi.hoisted(() => ({
  runActionMock: vi.fn(async (action: () => Promise<void>) => action()),
  serviceMock: {
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

function createClimateEntity(attributes: Record<string, unknown>): HassEntity {
  return {
    entity_id: 'climate.hallway',
    state: 'heat',
    attributes,
    last_changed: '2026-05-17T00:00:00.000Z',
    last_updated: '2026-05-17T00:00:00.000Z',
    context: { id: 'ctx', parent_id: null, user_id: null },
  } as HassEntity;
}

describe('useHVACCardController', () => {
  beforeEach(async () => {
    await resetAppStores();
    vi.clearAllMocks();
    useSettingsStore.setState({ temperatureUnit: 'fahrenheit' });
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
