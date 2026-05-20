import { act } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { renderHookWithProviders } from '@/test/render';

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

import { useSettingsStore } from '@/app/stores/settings-store';
import { useHVACCardController } from '../use-hvac-card-controller';

describe('useHVACCardController', () => {
  beforeEach(() => {
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
});
