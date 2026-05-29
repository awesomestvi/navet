import {
  getProviderRuntimeRegistration,
  hasProviderFeature,
} from '@navet/app/provider-runtime-registry';
import type { ProviderWeatherFeatureService } from '@/app/platform/provider-feature-services';
import {
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

function resolveWeatherProviderId(entityId: string) {
  return resolveIntegrationProviderId(entityId);
}

function getWeatherFeatureService(entityId: string) {
  const providerId = resolveWeatherProviderId(entityId);
  if (!hasProviderFeature(providerId, 'weather')) {
    throw new Error('Weather forecasts are not supported for the current integration yet');
  }
  const service = getProviderRuntimeRegistration(providerId).weatherFeatureService;
  if (!service) {
    throw new Error('Weather support is not implemented yet for the current integration');
  }

  return {
    nativeEntityId: getNativeIntegrationEntityId(entityId),
    service,
  };
}

export const integrationWeatherFeatureService: ProviderWeatherFeatureService = {
  async getForecast(entityId, type, options) {
    const { nativeEntityId, service } = getWeatherFeatureService(entityId);
    return await service.getForecast(nativeEntityId, type, options);
  },
};
