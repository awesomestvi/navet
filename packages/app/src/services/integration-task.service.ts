import type { PlatformTaskRuntimeSnapshot } from '@navet/app/platform/provider-feature-models';
import type { ProviderTaskFeatureService } from '@navet/app/platform/provider-feature-services';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import {
  getCurrentIntegrationProviderIdFromStore,
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

const EMPTY_TASK_RUNTIME_SNAPSHOT: PlatformTaskRuntimeSnapshot = {
  entities: null,
  rooms: [],
  devices: [],
  entityReferences: [],
};

function getCurrentTaskFeatureService() {
  return getProviderRuntimeRegistration(getCurrentIntegrationProviderIdFromStore())
    .taskFeatureService;
}

export const integrationTaskService: ProviderTaskFeatureService = {
  getTaskRuntimeSnapshot: () =>
    getCurrentTaskFeatureService()?.getTaskRuntimeSnapshot() ?? EMPTY_TASK_RUNTIME_SNAPSHOT,
  subscribeTaskRuntimeSnapshot: (listener) =>
    getCurrentTaskFeatureService()?.subscribeTaskRuntimeSnapshot(listener) ?? (() => {}),
  getAutomationDetails: async (entityId) => {
    const providerId = resolveIntegrationProviderId(entityId);
    if (providerId !== 'home_assistant') {
      throw new Error('Automation details are not supported for the current integration yet');
    }
    const service = getProviderRuntimeRegistration(providerId).taskFeatureService;
    if (!service) {
      throw new Error('Task support is not implemented yet for the current integration');
    }
    return await service.getAutomationDetails(getNativeIntegrationEntityId(entityId));
  },
  triggerAutomation: async (entityId) => {
    const providerId = resolveIntegrationProviderId(entityId);
    const service = getProviderRuntimeRegistration(providerId).taskFeatureService;
    if (!service) {
      throw new Error('Task support is not implemented yet for the current integration');
    }
    await service.triggerAutomation(getNativeIntegrationEntityId(entityId));
  },
};
