import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import type { ProviderTaskFeatureService } from '@/app/platform/provider-feature-services';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import { getIntegrationProviderTaskFeatureService } from './integration-registry.service';

function getCurrentTaskFeatureService() {
  return getIntegrationProviderTaskFeatureService(authSessionManager.getSnapshot().providerId);
}

export const integrationTaskService: ProviderTaskFeatureService = {
  getTaskRuntimeSnapshot: () => getCurrentTaskFeatureService().getTaskRuntimeSnapshot(),
  subscribeTaskRuntimeSnapshot: (listener) =>
    getCurrentTaskFeatureService().subscribeTaskRuntimeSnapshot(listener),
  getAutomationDetails: async (entityId) => {
    const providerId =
      parseProviderScopedId(entityId)?.providerId ?? authSessionManager.getSnapshot().providerId;
    if (providerId !== 'home_assistant') {
      throw new Error('Automation details are not supported for the current integration yet');
    }
    const service = getIntegrationProviderTaskFeatureService(providerId);
    return await service.getAutomationDetails(
      parseProviderScopedId(entityId)?.nativeId ?? entityId
    );
  },
};
