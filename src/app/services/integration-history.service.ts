import type { PlatformMessageClient } from '@/app/platform/provider-feature-models';
import type { ProviderHistoryFeatureService } from '@/app/platform/provider-feature-services';
import type { IntegrationProviderId } from '@/app/types/provider';
import {
  getCurrentIntegrationProviderIdFromStore,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';
import { getIntegrationProviderHistoryFeatureService } from './integration-registry.service';

export const integrationHistoryService: ProviderHistoryFeatureService = {
  getMessageClient: () => {
    const service = getIntegrationProviderHistoryFeatureService(
      getCurrentIntegrationProviderIdFromStore()
    );
    return service?.getMessageClient() ?? null;
  },
};

export function getIntegrationHistoryMessageClient(
  entityIdOrProviderId?: string | IntegrationProviderId
): PlatformMessageClient | null {
  const providerId = resolveIntegrationProviderId(entityIdOrProviderId);
  const service = getIntegrationProviderHistoryFeatureService(providerId);
  return service?.getMessageClient() ?? null;
}
