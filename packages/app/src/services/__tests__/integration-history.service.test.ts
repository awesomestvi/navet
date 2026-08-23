import { integrationStore } from '@navet/app/stores/integration-store';
import { beforeEach, describe, expect, it, vi } from 'vitest';

const { getProviderRuntimeRegistrationMock } = vi.hoisted(() => ({
  getProviderRuntimeRegistrationMock: vi.fn(),
}));

vi.mock('@navet/app/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: getProviderRuntimeRegistrationMock,
}));

import {
  getIntegrationEntityHistory,
  getIntegrationHistoryMessageClient,
  getIntegrationStatisticsHistory,
  integrationHistoryService,
  supportsIntegrationEnergyStatistics,
  supportsIntegrationStatisticsHistory,
} from '../integration-history.service';

describe('integrationHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    getProviderRuntimeRegistrationMock.mockImplementation(() => ({
      historyFeatureService: null,
    }));
    integrationStore.getState().setCurrentProviderId('home_assistant');
  });

  it('exposes the active provider message client through the history contract', () => {
    const sendMessagePromise = vi.fn();
    getProviderRuntimeRegistrationMock.mockReturnValue({
      historyFeatureService: {
        getMessageClient: () => ({ sendMessagePromise }),
      },
    });

    expect(integrationHistoryService.getMessageClient()).toEqual({
      sendMessagePromise,
    });
    expect(getProviderRuntimeRegistrationMock).toHaveBeenCalledWith('home_assistant');
  });

  it('resolves provider-scoped entity ids through the provider registry', () => {
    const sendMessagePromise = vi.fn();
    getProviderRuntimeRegistrationMock.mockReturnValue({
      historyFeatureService: {
        getMessageClient: () => ({ sendMessagePromise }),
      },
    });

    expect(getIntegrationHistoryMessageClient('home_assistant:sensor.energy')).toEqual({
      sendMessagePromise,
    });
    expect(getProviderRuntimeRegistrationMock).toHaveBeenCalledWith('home_assistant');
  });

  it('returns null when the provider has no history feature service', () => {
    getProviderRuntimeRegistrationMock.mockReturnValue({
      historyFeatureService: null,
    });

    expect(getIntegrationHistoryMessageClient('homey:sensor.energy')).toBeNull();
    expect(getProviderRuntimeRegistrationMock).toHaveBeenCalledWith('homey');
  });

  it('delegates raw history with a native id and restores the provider-scoped id', async () => {
    const getEntityHistory = vi.fn(async ({ entityId }: { entityId: string }) => ({
      entityId,
      points: [{ state: 'on', changedAt: '2026-07-14T08:30:00Z' }],
    }));
    getProviderRuntimeRegistrationMock.mockReturnValue({
      historyFeatureService: {
        getMessageClient: () => null,
        getEntityHistory,
      },
    });

    await expect(
      getIntegrationEntityHistory({
        entityId: 'home_assistant:binary_sensor.motion',
        startTime: '2026-07-14T08:00:00Z',
        endTime: '2026-07-14T09:00:00Z',
      })
    ).resolves.toEqual({
      entityId: 'home_assistant:binary_sensor.motion',
      points: [{ state: 'on', changedAt: '2026-07-14T08:30:00Z' }],
    });
    expect(getEntityHistory).toHaveBeenCalledWith({
      entityId: 'binary_sensor.motion',
      startTime: '2026-07-14T08:00:00Z',
      endTime: '2026-07-14T09:00:00Z',
    });
  });

  it('returns null when the provider does not implement raw entity history', async () => {
    getProviderRuntimeRegistrationMock.mockReturnValue({
      historyFeatureService: { getMessageClient: () => null },
    });

    await expect(
      getIntegrationEntityHistory({
        entityId: 'homey:sensor.temperature',
        startTime: '2026-07-14T08:00:00Z',
      })
    ).resolves.toBeNull();
  });

  it('uses provider-owned history support gates instead of provider identity checks', () => {
    getProviderRuntimeRegistrationMock.mockReturnValue({
      historyFeatureService: {
        getMessageClient: () => null,
        supportsStatisticsHistory: (entityId: string) => entityId.startsWith('sensor.'),
        supportsEnergyStatistics: (entityId: string) => entityId === 'sensor.energy',
      },
    });

    expect(supportsIntegrationStatisticsHistory('home_assistant:sensor.temperature')).toBe(true);
    expect(supportsIntegrationStatisticsHistory('home_assistant:binary_sensor.motion')).toBe(false);
    expect(supportsIntegrationEnergyStatistics('home_assistant:sensor.energy')).toBe(true);
    expect(supportsIntegrationEnergyStatistics('home_assistant:sensor.power')).toBe(false);
  });

  it('delegates normalized statistics with native ids and restores canonical ids', async () => {
    const getStatisticsHistory = vi.fn(async () => ({
      'sensor.house_power': [{ startMs: 1_787_040_000_000, endMs: 1_787_043_600_000, mean: 437 }],
      'sensor.kitchen_power': [],
    }));
    getProviderRuntimeRegistrationMock.mockReturnValue({
      historyFeatureService: {
        getMessageClient: () => null,
        getStatisticsHistory,
      },
    });

    await expect(
      getIntegrationStatisticsHistory({
        entityIds: ['home_assistant:sensor.house_power', 'home_assistant:sensor.kitchen_power'],
        startTime: '2026-08-20T00:00:00Z',
        endTime: '2026-08-20T02:00:00Z',
        period: 'hour',
        types: ['mean'],
        units: { 'home_assistant:sensor.house_power': 'W' },
      })
    ).resolves.toEqual({
      'home_assistant:sensor.house_power': [
        { startMs: 1_787_040_000_000, endMs: 1_787_043_600_000, mean: 437 },
      ],
      'home_assistant:sensor.kitchen_power': [],
    });
    expect(getStatisticsHistory).toHaveBeenCalledWith({
      entityIds: ['sensor.house_power', 'sensor.kitchen_power'],
      startTime: '2026-08-20T00:00:00Z',
      endTime: '2026-08-20T02:00:00Z',
      period: 'hour',
      types: ['mean'],
      units: { 'sensor.house_power': 'W' },
    });
  });

  it('rejects statistics queries that mix providers', async () => {
    await expect(
      getIntegrationStatisticsHistory({
        entityIds: ['home_assistant:sensor.house_power', 'homey:sensor.office_power'],
        startTime: '2026-08-20T00:00:00Z',
        period: 'hour',
        types: ['mean'],
      })
    ).rejects.toThrow('same provider');
  });
});
