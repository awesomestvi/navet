import type { ProviderWeatherFeatureService } from '@navet/app/platform/provider-feature-services';
import { resolveProviderFeatureService } from './integration-provider-service';

export const integrationWeatherFeatureService: ProviderWeatherFeatureService = {
  async getForecast(entityId, type, options) {
    const { nativeEntityId, service } = resolveProviderFeatureService({
      entityId,
      feature: 'weather',
      getService: (registration) => registration.weatherFeatureService,
      unsupportedMessage: 'Weather forecasts are not supported for the current integration yet',
      missingMessage: 'Weather support is not implemented yet for the current integration',
    });
    if (!nativeEntityId) {
      throw new Error('Weather forecasts require an entity id');
    }
    return await service.getForecast(nativeEntityId, type, options);
  },
};
