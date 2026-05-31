import type {
  ProviderClimateFeatureService,
  ProviderClimateTemperatureUpdate,
} from '@navet/app/platform/provider-feature-services';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import {
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

function getClimateFeatureService(entityId: string) {
  const providerId = resolveIntegrationProviderId(entityId);
  const service = getProviderRuntimeRegistration(providerId).climateFeatureService;
  if (!service) {
    throw new Error('Climate controls are not implemented yet for the current integration');
  }
  return service;
}

export const integrationClimateFeatureService: ProviderClimateFeatureService = {
  setTargetTemperature: async (entityId, update: ProviderClimateTemperatureUpdate) =>
    await getClimateFeatureService(entityId).setTargetTemperature(
      getNativeIntegrationEntityId(entityId),
      update
    ),
};
