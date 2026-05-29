import {
  getProviderRuntimeRegistration,
  hasProviderFeature,
} from '@navet/app/provider-runtime-registry';
import type { ProviderCalendarFeatureService } from '@/app/platform/provider-feature-services';
import {
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

function resolveCalendarProviderId(entityId: string) {
  return resolveIntegrationProviderId(entityId);
}

function getCalendarFeatureService(entityId: string) {
  const providerId = resolveCalendarProviderId(entityId);
  if (!hasProviderFeature(providerId, 'calendar')) {
    throw new Error('Calendar events are not supported for the current integration yet');
  }
  const service = getProviderRuntimeRegistration(providerId).calendarFeatureService;
  if (!service) {
    throw new Error('Calendar support is not implemented yet for the current integration');
  }

  return {
    nativeEntityId: getNativeIntegrationEntityId(entityId),
    service,
  };
}

export const integrationCalendarFeatureService: ProviderCalendarFeatureService = {
  async getEvents(entityId, options) {
    const { nativeEntityId, service } = getCalendarFeatureService(entityId);
    return await service.getEvents(nativeEntityId, options);
  },
};
