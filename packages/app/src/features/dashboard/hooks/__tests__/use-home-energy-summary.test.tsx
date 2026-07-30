import { act, renderHook, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { useHomeEnergySummary } from '../use-home-energy-summary';

const mocks = vi.hoisted(() => ({
  connected: true,
  currentProviderId: 'home_assistant',
  getMessageClient: vi.fn(() => ({ sendMessagePromise: vi.fn() })),
  getSourceConfig: vi.fn(),
  resolveTodayEnergyKWh: vi.fn(
    (_entities: unknown, _entityId: string | undefined, statisticsKWh: number | undefined) =>
      statisticsKWh ?? 0
  ),
  useEnergyStatisticsToday: vi.fn(),
  useProviderEntitySnapshotRecord: vi.fn(),
}));

vi.mock('@navet/app/hooks', () => ({
  useIntegrationStore: (selector: (state: unknown) => unknown) =>
    selector({
      currentProviderId: mocks.currentProviderId,
      providerRuntime: {
        [mocks.currentProviderId]: {
          connected: mocks.connected,
        },
      },
    }),
}));

vi.mock('@navet/app/hooks/use-provider-entity', () => ({
  useProviderEntitySnapshotRecord: mocks.useProviderEntitySnapshotRecord,
}));

vi.mock('@navet/app/features/energy/hooks/use-energy-statistics-today', () => ({
  useEnergyStatisticsToday: mocks.useEnergyStatisticsToday,
}));

vi.mock('@navet/app/features/energy/hooks/use-energy-ha-data', () => ({
  resolveTodayEnergyKWh: mocks.resolveTodayEnergyKWh,
}));

vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: () => ({
    energyFeatureService: {
      getSourceConfig: mocks.getSourceConfig,
    },
  }),
}));

vi.mock('@navet/app/services/integration-history.service', () => ({
  getIntegrationHistoryMessageClient: mocks.getMessageClient,
}));

describe('useHomeEnergySummary', () => {
  beforeEach(() => {
    mocks.connected = true;
    mocks.currentProviderId = 'home_assistant';
    mocks.getMessageClient.mockClear();
    mocks.getSourceConfig.mockReset();
    mocks.getSourceConfig.mockResolvedValue({
      devices: [],
      gridImportEnergyEntityId: 'sensor.grid_import',
    });
    mocks.resolveTodayEnergyKWh.mockClear();
    mocks.useEnergyStatisticsToday.mockReset();
    mocks.useEnergyStatisticsToday.mockReturnValue({
      hasLoaded: true,
      values: {
        'sensor.grid_import': 4.2,
      },
    });
    mocks.useProviderEntitySnapshotRecord.mockReset();
    mocks.useProviderEntitySnapshotRecord.mockReturnValue({
      'sensor.grid_import': {
        entityId: 'sensor.grid_import',
        state: '1042',
        attributes: {
          friendly_name: 'Grid import',
          unit_of_measurement: 'kWh',
        },
      },
    });
  });

  it('subscribes only to the configured grid-import entity and its today statistic', async () => {
    const { result } = renderHook(() => useHomeEnergySummary());

    await waitFor(() => {
      expect(result.current.gridImportTodayKWh).toBe(4.2);
    });

    expect(mocks.getSourceConfig).toHaveBeenCalledTimes(1);
    expect(mocks.useProviderEntitySnapshotRecord).toHaveBeenLastCalledWith(['sensor.grid_import'], {
      enabled: true,
      providerId: 'home_assistant',
    });
    expect(mocks.useEnergyStatisticsToday).toHaveBeenLastCalledWith(
      {
        'sensor.grid_import': 'kWh',
      },
      true
    );
  });

  it('does not load or subscribe when Home Assistant is not the active connected provider', () => {
    mocks.currentProviderId = 'homey';

    const { result } = renderHook(() => useHomeEnergySummary());

    act(() => undefined);

    expect(result.current).toEqual({
      gridImportTodayKWh: undefined,
      isConfigured: false,
    });
    expect(mocks.getSourceConfig).not.toHaveBeenCalled();
    expect(mocks.useProviderEntitySnapshotRecord).toHaveBeenLastCalledWith([], {
      enabled: false,
      providerId: 'home_assistant',
    });
    expect(mocks.useEnergyStatisticsToday).toHaveBeenLastCalledWith({}, false);
  });
});
