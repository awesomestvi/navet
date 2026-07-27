import type {
  ProviderRoomManagementCapabilities,
  ProviderRoomManagementCapability,
} from '@navet/core/provider-feature-models';
import { createProviderRoomManagementCapabilities } from '@navet/core/provider-room-management';
import { getProviderRuntimeRegistrationEntry } from './provider-package-registry';
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

export function resetProviderRuntimeRegistrationCache(providerId?: IntegrationProviderId) {
  if (!providerRuntimeRegistrations) {
    return;
  }

  if (providerId) {
    delete providerRuntimeRegistrations[providerId];
    return;
  }

  providerRuntimeRegistrations = undefined;
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

  const registration = getProviderRuntimeRegistrationEntry(providerId);
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

export function getProviderRoomManagementCapabilities(
  providerId: IntegrationProviderId
): ProviderRoomManagementCapabilities {
  const registration = getProviderRuntimeRegistration(providerId);
  return (
    registration.roomManagementCapabilities ??
    createProviderRoomManagementCapabilities(providerId, {
      discover: registration.featureMatrix.rooms,
    })
  );
}

export function hasProviderRoomManagementCapability(
  providerId: IntegrationProviderId,
  capability: ProviderRoomManagementCapability
): boolean {
  return getProviderRoomManagementCapabilities(providerId)[capability];
}
