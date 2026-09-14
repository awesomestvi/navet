import { integrationStore } from '@navet/app/stores/integration-store';
import { renderHookWithProviders } from '@navet/app/test/render';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { useHomeAssistantProviderEnergyDataMock } = vi.hoisted(() => ({
  useHomeAssistantProviderEnergyDataMock: vi.fn(),
}));

const { measuredMock } = vi.hoisted(() => ({ measuredMock: vi.fn() }));
vi.mock('../use-measured-device-energy', () => ({ useMeasuredDeviceEnergy: measuredMock }));

vi.mock('../use-home-assistant-provider-energy-data', () => ({
  useHomeAssistantProviderEnergyData: useHomeAssistantProviderEnergyDataMock,
}));

import { useProviderEnergyData } from '../use-provider-energy-data';

describe('useProviderEnergyData', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    measuredMock.mockReturnValue({ consumers: [], isConnected: false });
    useHomeAssistantProviderEnergyDataMock.mockReturnValue({
      batteryDevices: [{ id: 'sensor.battery', name: 'Battery', level: 82 }],
      currentLoadStatisticId: 'sensor.home_power',
      energySourceDiagnostics: [{ id: 'grid', label: 'Grid import', status: 'configured_numeric' }],
      haSourceConfig: { devices: [], gridImportEnergyEntityId: 'sensor.grid_energy' },
      hasEnergyStatisticsLoaded: true,
      isLoading: false,
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

  it('returns the Home Assistant energy snapshot when Home Assistant is selected alongside another provider', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'openhab',
      selectedProviderIds: ['openhab', 'home_assistant'],
    });

    const { result } = renderHookWithProviders(() => useProviderEnergyData('now'));

    expect(useHomeAssistantProviderEnergyDataMock).toHaveBeenCalledWith('now', true);
    expect(result.current.isConfigured).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.currentLoadStatisticId).toBe('sensor.home_power');
  });

  it('returns an empty snapshot when selected providers have no energy readings', () => {
    integrationStore.setState({
      ...integrationStore.getState(),
      currentProviderId: 'homey',
      selectedProviderIds: ['homey'],
    });

    const { result } = renderHookWithProviders(() => useProviderEnergyData('now'));

    expect(useHomeAssistantProviderEnergyDataMock).toHaveBeenCalledWith('now', false);
    expect(result.current.isConfigured).toBe(false);
    expect(result.current.isConnected).toBe(false);
    expect(result.current.periodTotals).toEqual({ today: 0, week: 0, month: 0 });
    expect(result.current.energySourceDiagnostics).toEqual([]);
  });

  it('includes Homey consumers alongside configured whole-home readings without double counting the total', () => {
    integrationStore.setState({ selectedProviderIds: ['home_assistant', 'homey'] });
    measuredMock.mockReturnValue({
      isConnected: true,
      consumers: [
        {
          id: 'homey:plug#meter_power',
          name: 'Coffee maker',
          powerW: 485,
          energyKWh: 0.2,
          category: 'other',
          shareOfLoad: 0,
          costToday: 0,
          status: 'active',
        },
      ],
    });
    const { result } = renderHookWithProviders(() => useProviderEnergyData('now'));
    expect(result.current.overview.topConsumers[0]).toMatchObject({
      name: 'Coffee maker',
      powerW: 485,
      energyKWh: 0.2,
    });
    expect(result.current.overview.totals.currentLoadW).toBe(1200);
    expect(result.current.todayTotalUsageKWh).toBe(4.2);
  });

  it('shows live device energy without requiring a Home Assistant energy configuration', () => {
    integrationStore.setState({ selectedProviderIds: ['homey'] });
    measuredMock.mockReturnValue({
      isConnected: true,
      consumers: [
        {
          id: 'homey:plug#meter_power',
          name: 'Coffee maker',
          powerW: 485,
          energyKWh: 0.2,
          category: 'other',
          shareOfLoad: 0,
          costToday: 0,
          status: 'active',
        },
      ],
    });
    const { result } = renderHookWithProviders(() => useProviderEnergyData('now'));
    expect(result.current.isConfigured).toBe(true);
    expect(result.current.isConnected).toBe(true);
    expect(result.current.overview.topConsumers[0]).toMatchObject({ powerW: 485, energyKWh: 0.2 });
    expect(result.current.overview.totals.currentLoadW).toBe(0);
    expect(result.current.periodTotals.today).toBe(0);
    expect(result.current.overview.totals.importTodayKWh).toBe(0);
  });
});
