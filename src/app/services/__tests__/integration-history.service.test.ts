import { beforeEach, describe, expect, it, vi } from 'vitest';
import { integrationStore } from '@/app/stores/integration-store';

const { getProviderRuntimeRegistrationMock } = vi.hoisted(() => ({
  getProviderRuntimeRegistrationMock: vi.fn(),
}));

vi.mock('@/providers/provider-runtime-registry', () => ({
  getProviderRuntimeRegistration: getProviderRuntimeRegistrationMock,
}));

import {
  getIntegrationHistoryMessageClient,
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
});
