import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import type { ProviderWeatherFeatureService } from '@/app/platform/provider-feature-services';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import {
  getIntegrationProviderAdapter,
  getIntegrationProviderWeatherFeatureService,
  hasIntegrationProviderFeature,
} from './integration-registry.service';

function resolveWeatherProviderId(entityId: string) {
  return parseProviderScopedId(entityId)?.providerId ?? authSessionManager.getSnapshot().providerId;
}

function getWeatherFeatureService(entityId: string) {
  const providerId = resolveWeatherProviderId(entityId);
  const adapter = getIntegrationProviderAdapter(providerId);
  if (!hasIntegrationProviderFeature(adapter, 'weather')) {
    throw new Error('Weather forecasts are not supported for the current integration yet');
  }

  return {
    nativeEntityId: parseProviderScopedId(entityId)?.nativeId ?? entityId,
    service: getIntegrationProviderWeatherFeatureService(providerId),
  };
}

export const integrationWeatherFeatureService: ProviderWeatherFeatureService = {
  async getForecast(entityId, type, options) {
    const { nativeEntityId, service } = getWeatherFeatureService(entityId);
    return await service.getForecast(nativeEntityId, type, options);
  },
};
