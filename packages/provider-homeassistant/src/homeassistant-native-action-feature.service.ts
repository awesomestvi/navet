import type { ProviderNativeActionFeatureService } from '@navet/core/provider-feature-services';
import { callHomeAssistantService } from './homeassistant-service-bridge';

export const homeAssistantNativeActionFeatureService: ProviderNativeActionFeatureService = {
  async invokeAction({ entityId, domain, service, serviceData = {}, target }) {
    await callHomeAssistantService(domain, service, serviceData, {
      ...target,
      ...(entityId ? { entityId } : {}),
    });
  },
};
