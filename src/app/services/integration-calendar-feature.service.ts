import type { ProviderCalendarFeatureService } from '@/app/platform/provider-feature-services';
import {
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';
import {
  getIntegrationProviderAdapter,
  getIntegrationProviderCalendarFeatureService,
  hasIntegrationProviderFeature,
} from './integration-registry.service';

function resolveCalendarProviderId(entityId: string) {
  return resolveIntegrationProviderId(entityId);
}

function getCalendarFeatureService(entityId: string) {
  const providerId = resolveCalendarProviderId(entityId);
  const adapter = getIntegrationProviderAdapter(providerId);
  if (!hasIntegrationProviderFeature(adapter, 'calendar')) {
    throw new Error('Calendar events are not supported for the current integration yet');
  }

  return {
    nativeEntityId: getNativeIntegrationEntityId(entityId),
    service: getIntegrationProviderCalendarFeatureService(providerId),
  };
}

export const integrationCalendarFeatureService: ProviderCalendarFeatureService = {
  async getEvents(entityId, options) {
    const { nativeEntityId, service } = getCalendarFeatureService(entityId);
    return await service.getEvents(nativeEntityId, options);
  },
};
