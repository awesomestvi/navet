import type { PlatformMessageClient } from '@navet/app/platform/provider-feature-models';
import type { ProviderHistoryFeatureService } from '@navet/app/platform/provider-feature-services';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import {
  getCurrentIntegrationProviderIdFromStore,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

export const integrationHistoryService: ProviderHistoryFeatureService = {
  getMessageClient: () => {
    const service = getProviderRuntimeRegistration(
      getCurrentIntegrationProviderIdFromStore()
    ).historyFeatureService;
    return service?.getMessageClient() ?? null;
  },
};

export function getIntegrationHistoryMessageClient(
  entityIdOrProviderId?: string | IntegrationProviderId
): PlatformMessageClient | null {
  const providerId = resolveIntegrationProviderId(entityIdOrProviderId);
  const service = getProviderRuntimeRegistration(providerId).historyFeatureService;
  return service?.getMessageClient() ?? null;
}

export function supportsIntegrationStatisticsHistory(
  entityIdOrProviderId?: string | IntegrationProviderId
): boolean {
  const providerId = resolveIntegrationProviderId(entityIdOrProviderId);
  const service = getProviderRuntimeRegistration(providerId).historyFeatureService;
  if (!service) {
    return false;
  }

  if (
    typeof service.supportsStatisticsHistory === 'function' &&
    typeof entityIdOrProviderId === 'string'
  ) {
    return service.supportsStatisticsHistory(entityIdOrProviderId.replace(/^[^:]+:/, ''));
  }

  return service.getMessageClient() !== null;
}

export function supportsIntegrationEnergyStatistics(
  entityIdOrProviderId?: string | IntegrationProviderId
): boolean {
  const providerId = resolveIntegrationProviderId(entityIdOrProviderId);
  const service = getProviderRuntimeRegistration(providerId).historyFeatureService;
  if (!service) {
    return false;
  }

  if (
    typeof service.supportsEnergyStatistics === 'function' &&
    typeof entityIdOrProviderId === 'string'
  ) {
    return service.supportsEnergyStatistics(entityIdOrProviderId.replace(/^[^:]+:/, ''));
  }

  return service.getMessageClient() !== null;
}
