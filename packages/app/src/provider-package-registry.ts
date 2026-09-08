import { integrationSessionRuntime } from '@navet/app/integration-session-runtime';
import type {
  ProviderContractRegistration,
  ProviderPackageRegistration,
} from '@navet/core/provider-runtime-types';
import { createHomeyProviderPackageRegistration } from '@navet/provider-homey';
import { createOpenHABProviderPackageRegistration } from '@navet/provider-openhab';
import { createHomeAssistantAppProviderPackageRegistration } from './provider-composition/home-assistant-package-registration';
import type { IntegrationProviderRuntimeRegistration } from './provider-runtime-types';
import { homeyService } from './services/homey.service';
import { ensureHomeyApiClientConfigured } from './services/homey-api-client.service';
import { homeyEntityRuntimeService } from './services/homey-entity-runtime.service';
import {
  type ImplementedIntegrationProviderId,
  type IntegrationProviderId,
  isImplementedIntegrationProviderId,
} from './types/provider';

function getProviderSession(providerId: IntegrationProviderId) {
  return integrationSessionRuntime.getSnapshot().sessions[providerId];
}

const providerPackageRegistrationFactories: Record<
  ImplementedIntegrationProviderId,
  () => ProviderPackageRegistration
> = {
  home_assistant: () =>
    createHomeAssistantAppProviderPackageRegistration({
      getProviderSession,
    }),
  homey: () =>
    createHomeyProviderPackageRegistration({
      dependencies: {
        ensureHomeyApiClientConfigured,
        homeyService,
        entityRuntimeService: homeyEntityRuntimeService,
      },
      getSession: () => getProviderSession('homey'),
    }),
  openhab: () =>
    createOpenHABProviderPackageRegistration({
      getSession: () => getProviderSession('openhab'),
    }),
};

var providerPackageRegistrationOverrides:
  | Partial<Record<IntegrationProviderId, ProviderPackageRegistration | null>>
  | undefined;

var providerPackageRegistrations:
  | Partial<Record<IntegrationProviderId, ProviderPackageRegistration>>
  | undefined;

export function getProviderPackageRegistration(
  providerId: IntegrationProviderId
): ProviderPackageRegistration {
  if (!isImplementedIntegrationProviderId(providerId)) {
    throw new Error(`Provider ${providerId} is planned and has no runtime adapter`);
  }

  const override = providerPackageRegistrationOverrides?.[providerId];
  if (override) {
    return override;
  }

  if (!providerPackageRegistrations) {
    providerPackageRegistrations = {};
  }

  const existing = providerPackageRegistrations[providerId];
  if (existing) {
    return existing;
  }

  const registration = providerPackageRegistrationFactories[providerId]();
  providerPackageRegistrations[providerId] = registration;
  return registration;
}

export function setProviderPackageRegistrationOverride(
  providerId: IntegrationProviderId,
  registration: ProviderPackageRegistration | null
) {
  if (!providerPackageRegistrationOverrides) {
    providerPackageRegistrationOverrides = {};
  }

  providerPackageRegistrationOverrides[providerId] = registration;

  if (providerPackageRegistrations) {
    delete providerPackageRegistrations[providerId];
  }
}

export function getProviderContractRegistration(
  providerId: IntegrationProviderId
): ProviderContractRegistration {
  return getProviderPackageRegistration(providerId);
}

export function getProviderRuntimeRegistrationEntry(
  providerId: IntegrationProviderId
): IntegrationProviderRuntimeRegistration {
  return getProviderPackageRegistration(providerId).runtimeRegistration;
}
