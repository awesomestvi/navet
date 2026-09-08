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
import {
  IMPLEMENTED_INTEGRATION_PROVIDER_IDS,
  type IntegrationProviderId,
  isImplementedIntegrationProviderId,
} from './types/provider';

const PLANNED_PROVIDER_FEATURE_MATRIX: IntegrationProviderFeatureMatrix = Object.freeze({
  rooms: false,
  lighting: false,
  sensors: false,
  climate: false,
  mediaControls: false,
  mediaBrowse: false,
  mediaArtwork: false,
  cameraSnapshot: false,
  cameraStreams: false,
  energyNow: false,
  calendar: false,
  weather: false,
  notifications: false,
  tasks: false,
  conversation: false,
});

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
  return IMPLEMENTED_INTEGRATION_PROVIDER_IDS.map((providerId) =>
    getProviderRuntimeRegistration(providerId)
  );
}

export function getProviderFeatureMatrix(
  providerId: IntegrationProviderId
): IntegrationProviderFeatureMatrix {
  if (!isImplementedIntegrationProviderId(providerId)) {
    return PLANNED_PROVIDER_FEATURE_MATRIX;
  }

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
