import type {
  IntegrationProviderRuntimeRegistration,
  ProviderContractRegistration,
} from '@navet/core/provider-runtime-types';
import { openhabEntityRuntimeService } from './openhab-entity-runtime.service';

export function createOpenHABRuntimeRegistration(
  registration: ProviderContractRegistration
): IntegrationProviderRuntimeRegistration {
  return {
    providerContractAdapter: registration.providerContractAdapter,
    contract: registration.contract,
    implementationStatus: 'implemented',
    capabilities: {
      pathSigning: false,
      cameraStreams: false,
    },
    featureMatrix: {
      rooms: true,
      lighting: true,
      sensors: true,
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
    entityRuntimeService: openhabEntityRuntimeService,
  };
}
