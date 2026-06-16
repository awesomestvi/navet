import {
  INTEGRATION_PROVIDERS,
  type IntegrationProviderId,
  type IntegrationProviderRuntimeRegistration,
  type NavetProviderContract,
  type NavetProviderSessionInput,
  type ProviderContractRegistration,
} from '@navet/core';
import { UnsupportedProviderCommandError } from '@navet/core/errors';
import { createSnapshotBackedProviderAdapter } from '@navet/core/snapshot-backed-adapter';
import type { NavetProviderState } from '@navet/core/types';

function createEmptyProviderState(providerId: IntegrationProviderId): NavetProviderState {
  return {
    providerId,
    connected: false,
    entities: [],
    rooms: [],
  };
}

export function createPlannedProviderContract(
  providerId: IntegrationProviderId
): NavetProviderContract {
  return {
    providerId,
    getState: () => createEmptyProviderState(providerId),
  };
}

export function createPlannedProviderContractAdapter(
  providerId: IntegrationProviderId,
  contract: NavetProviderContract = createPlannedProviderContract(providerId),
  options: {
    getSession?: () => NavetProviderSessionInput | null | undefined;
  } = {}
) {
  return createSnapshotBackedProviderAdapter({
    providerId,
    providerLabel: INTEGRATION_PROVIDERS[providerId].label,
    contract,
    executeCommand: async (entity, command) => {
      void entity;
      throw new UnsupportedProviderCommandError((command as { type: string }).type);
    },
    getSession: options.getSession,
  });
}

export function createPlannedProviderRuntimeRegistration(
  registration: ProviderContractRegistration
): IntegrationProviderRuntimeRegistration {
  return {
    providerContractAdapter: registration.providerContractAdapter,
    contract: registration.contract,
    implementationStatus: 'planned' as const,
    capabilities: {
      pathSigning: false,
      cameraStreams: false,
    },
    featureMatrix: {
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
    },
  };
}
