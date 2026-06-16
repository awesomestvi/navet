import type { ProviderNativeActionFeatureService } from '@navet/core/provider-feature-services';
import { callHomeyService } from './homey-bridge';

export const homeyNativeActionFeatureService: ProviderNativeActionFeatureService = {
  async invokeAction({ entityId, domain, service, serviceData = {}, target }) {
    await callHomeyService(domain, service, serviceData, {
      ...target,
      ...(entityId ? { entityId } : {}),
    });
  },
};
