import { createHomeAssistantRuntimeRegistration } from '@navet/provider-homeassistant/homeassistant-runtime-registration';
import { createHomeyRuntimeRegistration } from '@navet/provider-homey/homey-runtime-registration';
import { createHubitatRuntimeRegistration } from '@navet/provider-hubitat/hubitat-runtime-registration';
import { createOpenHABRuntimeRegistration } from '@navet/provider-openhab/openhab-runtime-registration';
import { createSmartThingsRuntimeRegistration } from '@navet/provider-smartthings/smartthings-runtime-registration';
import { getProviderContractRegistration } from './provider-contract-registry';
import type {
  IntegrationProviderCapabilities,
  IntegrationProviderCapability,
  IntegrationProviderFeature,
  IntegrationProviderFeatureMatrix,
  IntegrationProviderRuntimeRegistration,
} from './provider-runtime-types';
import { INTEGRATION_PROVIDER_IDS, type IntegrationProviderId } from './types/provider';

var providerRuntimeRegistrations:
  | Partial<Record<IntegrationProviderId, IntegrationProviderRuntimeRegistration>>
  | undefined;

function createProviderRuntimeRegistration(
  providerId: IntegrationProviderId
): IntegrationProviderRuntimeRegistration {
  switch (providerId) {
    case 'home_assistant':
      return createHomeAssistantRuntimeRegistration(
        getProviderContractRegistration('home_assistant')
      );
    case 'homey':
      return createHomeyRuntimeRegistration(getProviderContractRegistration('homey'));
    case 'openhab':
      return createOpenHABRuntimeRegistration(getProviderContractRegistration('openhab'));
    case 'hubitat':
      return createHubitatRuntimeRegistration(getProviderContractRegistration('hubitat'));
    case 'smartthings':
      return createSmartThingsRuntimeRegistration(getProviderContractRegistration('smartthings'));
  }
}

export function getProviderRuntimeRegistration(
  providerId: IntegrationProviderId
): IntegrationProviderRuntimeRegistration {
  if (!providerRuntimeRegistrations) {
    providerRuntimeRegistrations = {};
  }

  const existing = providerRuntimeRegistrations[providerId];
  if (existing) {
    return existing;
  }

  const registration = createProviderRuntimeRegistration(providerId);
  providerRuntimeRegistrations[providerId] = registration;
  return registration;
}

export function listProviderRuntimeRegistrations(): IntegrationProviderRuntimeRegistration[] {
  return INTEGRATION_PROVIDER_IDS.map((providerId) => getProviderRuntimeRegistration(providerId));
}

export function getProviderFeatureMatrix(
  providerId: IntegrationProviderId
): IntegrationProviderFeatureMatrix {
  return getProviderRuntimeRegistration(providerId).featureMatrix;
}

export function hasProviderFeature(
  providerId: IntegrationProviderId,
  feature: IntegrationProviderFeature
): boolean {
  return getProviderFeatureMatrix(providerId)[feature];
}

export function hasProviderCapability(
  providerId: IntegrationProviderId,
  capability: IntegrationProviderCapability
): boolean {
  return getProviderRuntimeRegistration(providerId).capabilities[capability];
}

export function getProviderCapabilities(
  providerId: IntegrationProviderId
): IntegrationProviderCapabilities {
  return getProviderRuntimeRegistration(providerId).capabilities;
}
