import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import type { ProviderCalendarFeatureService } from '@/app/platform/provider-feature-services';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import {
  getIntegrationProviderAdapter,
  getIntegrationProviderCalendarFeatureService,
  hasIntegrationProviderFeature,
} from './integration-registry.service';

function resolveCalendarProviderId(entityId: string) {
  return parseProviderScopedId(entityId)?.providerId ?? authSessionManager.getSnapshot().providerId;
}

function getCalendarFeatureService(entityId: string) {
  const providerId = resolveCalendarProviderId(entityId);
  const adapter = getIntegrationProviderAdapter(providerId);
  if (!hasIntegrationProviderFeature(adapter, 'calendar')) {
    throw new Error('Calendar events are not supported for the current integration yet');
  }

  return {
    nativeEntityId: parseProviderScopedId(entityId)?.nativeId ?? entityId,
    service: getIntegrationProviderCalendarFeatureService(providerId),
  };
}

export const integrationCalendarFeatureService: ProviderCalendarFeatureService = {
  async getEvents(entityId, options) {
    const { nativeEntityId, service } = getCalendarFeatureService(entityId);
    return await service.getEvents(nativeEntityId, options);
  },
};
