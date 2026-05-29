import type { ProviderTaskFeatureService } from '@/app/platform/provider-feature-services';
import {
  getCurrentIntegrationProviderIdFromStore,
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';
import { getIntegrationProviderTaskFeatureService } from './integration-registry.service';

function getCurrentTaskFeatureService() {
  return getIntegrationProviderTaskFeatureService(getCurrentIntegrationProviderIdFromStore());
}

export const integrationTaskService: ProviderTaskFeatureService = {
  getTaskRuntimeSnapshot: () => getCurrentTaskFeatureService().getTaskRuntimeSnapshot(),
  subscribeTaskRuntimeSnapshot: (listener) =>
    getCurrentTaskFeatureService().subscribeTaskRuntimeSnapshot(listener),
  getAutomationDetails: async (entityId) => {
    const providerId = resolveIntegrationProviderId(entityId);
    if (providerId !== 'home_assistant') {
      throw new Error('Automation details are not supported for the current integration yet');
    }
    const service = getIntegrationProviderTaskFeatureService(providerId);
    return await service.getAutomationDetails(getNativeIntegrationEntityId(entityId));
  },
};
