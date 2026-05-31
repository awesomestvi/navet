import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useHomeAssistantProviderEnergyDataMock } = vi.hoisted(() => ({
  useHomeAssistantProviderEnergyDataMock: vi.fn(),
}));

vi.mock('../use-home-assistant-provider-energy-data', () => ({
  useHomeAssistantProviderEnergyData: useHomeAssistantProviderEnergyDataMock,
}));

import { useProviderEnergyData } from '../use-provider-energy-data';

describe('useProviderEnergyData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    useHomeAssistantProviderEnergyDataMock.mockReturnValue({
      batteryDevices: [{ id: 'sensor.battery', name: 'Battery', level: 82 }],
      currentLoadStatisticId: 'sensor.home_power',
      energySourceDiagnostics: [{ id: 'grid', label: 'Grid import', status: 'configured_numeric' }],
      haSourceConfig: { devices: [], gridImportEnergyEntityId: 'sensor.grid_energy' },
      hasEnergyStatisticsLoaded: true,
      isConfigured: true,
      isConnected: true,
      overview: {
        liveStats: [],
        flow: [],
        trend: [],
        topConsumers: [],
        insights: [],
        totals: {
          currentLoadW: 1200,
          solarW: 300,
          batteryPercent: 50,
          importW: 900,
          exportW: 0,
          importTodayKWh: 4.2,
          solarTodayKWh: 1.1,
          gasTodayKWh: 0,
          hotWaterTodayKWh: 0,
          costToday: 0,
          projectedMonthCost: 0,
        },
        nodes: [],
      },
      periodTotals: { today: 4.2, week: 22, month: 88 },
      recentLoadTrend: [],
      todayTotalUsageKWh: 4.2,
    });
  });

  it('returns the Home Assistant energy snapshot when Home Assistant is active', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'home_assistant',
    });

    const { result } = renderHookWithProviders(() => useProviderEnergyData('now'));

    expect(useHomeAssistantProviderEnergyDataMock).toHaveBeenCalledWith('now', true);
    expect(result.current.isConfigured).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.currentLoadStatisticId).toBe('sensor.home_power');
  });

  it('returns an empty snapshot for providers without energy support', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'homey',
    });

    const { result } = renderHookWithProviders(() => useProviderEnergyData('now'));

    expect(useHomeAssistantProviderEnergyDataMock).toHaveBeenCalledWith('now', false);
    expect(result.current.isConfigured).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.periodTotals).toEqual({ today: 0, week: 0, month: 0 });
    expect(result.current.energySourceDiagnostics).toEqual([]);
  });
});
