import { dispatchEntityCommand } from '@navet/app/commands';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import type {
  ProviderLightFeatureService,
  ProviderLightUpdateOptions,
} from '@/app/platform/provider-feature-services';
import {
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

function resolveLightProviderId(entityId: string) {
  return resolveIntegrationProviderId(entityId);
}

function getLightFeatureService(providerId: ReturnType<typeof resolveLightProviderId>) {
  const service = getProviderRuntimeRegistration(providerId).lightFeatureService;
  if (!service) {
    throw new Error('Advanced light controls are not implemented yet for the current integration');
  }

  return service;
}

export function hasIntegrationLightFeatureService(entityId: string): boolean {
  return Boolean(
    getProviderRuntimeRegistration(resolveLightProviderId(entityId)).lightFeatureService
  );
}

async function dispatchBasicLightUpdate(
  entityId: string,
  options: ProviderLightUpdateOptions
): Promise<void> {
  if (options.state === 'off') {
    await dispatchEntityCommand({ type: 'turn_off', entityId });
    return;
  }

  if (
    options.state === 'on' &&
    typeof options.brightnessPct !== 'number' &&
    typeof options.kelvin !== 'number'
  ) {
    await dispatchEntityCommand({ type: 'turn_on', entityId });
  }

  if (typeof options.brightnessPct === 'number') {
    await dispatchEntityCommand({
      type: 'set_brightness',
      entityId,
      brightness: options.brightnessPct,
    });
  }

  if (typeof options.kelvin === 'number') {
    await dispatchEntityCommand({
      type: 'set_color_temperature',
      entityId,
      kelvin: options.kelvin,
    });
  }
}

export const integrationLightFeatureService: ProviderLightFeatureService & {
  applyBasicLightUpdate: (entityId: string, options: ProviderLightUpdateOptions) => Promise<void>;
} = {
  applyBasicLightUpdate: dispatchBasicLightUpdate,
  updateLight: async (entityId, options) =>
    await getLightFeatureService(resolveLightProviderId(entityId)).updateLight(
      getNativeIntegrationEntityId(entityId),
      options
    ),
};
