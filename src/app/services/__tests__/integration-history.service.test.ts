import { beforeEach, describe, expect, it, vi } from 'vitest';
import { integrationStore } from '@/app/stores/integration-store';

const { getProviderHistoryFeatureServiceMock } = vi.hoisted(() => ({
  getProviderHistoryFeatureServiceMock: vi.fn(),
}));

vi.mock('../integration-registry.service', () => ({
  getIntegrationProviderHistoryFeatureService: getProviderHistoryFeatureServiceMock,
}));

import {
  getIntegrationHistoryMessageClient,
  integrationHistoryService,
} from '../integration-history.service';

describe('integrationHistoryService', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    integrationStore.getState().setCurrentProviderId('home_assistant');
  });

  it('exposes the active provider message client through the history contract', () => {
    const sendMessagePromise = vi.fn();
    getProviderHistoryFeatureServiceMock.mockReturnValue({
      getMessageClient: () => ({ sendMessagePromise }),
    });

    expect(integrationHistoryService.getMessageClient()).toEqual({
      sendMessagePromise,
    });
    expect(getProviderHistoryFeatureServiceMock).toHaveBeenCalledWith('home_assistant');
  });

  it('resolves provider-scoped entity ids through the provider registry', () => {
    const sendMessagePromise = vi.fn();
    getProviderHistoryFeatureServiceMock.mockReturnValue({
      getMessageClient: () => ({ sendMessagePromise }),
    });

    expect(getIntegrationHistoryMessageClient('home_assistant:sensor.energy')).toEqual({
      sendMessagePromise,
    });
    expect(getProviderHistoryFeatureServiceMock).toHaveBeenCalledWith('home_assistant');
  });

  it('returns null when the provider has no history feature service', () => {
    getProviderHistoryFeatureServiceMock.mockReturnValue(null);

    expect(getIntegrationHistoryMessageClient('homey:sensor.energy')).toBeNull();
    expect(getProviderHistoryFeatureServiceMock).toHaveBeenCalledWith('homey');
  });
});
