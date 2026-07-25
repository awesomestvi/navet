import { createProviderRoomManagementCapabilities } from '@navet/core/provider-room-management';
import type {
  IntegrationProviderRuntimeRegistration,
  ProviderContractRegistration,
} from '@navet/core/provider-runtime-types';
import { getHomeyEntityRuntimeService } from './homey-bridge';
import { homeyNativeActionFeatureService } from './homey-native-action-feature.service';

export const homeyRoomManagementCapabilities = createProviderRoomManagementCapabilities('homey', {
  discover: true,
});

export function createHomeyRuntimeRegistration(
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
    roomManagementCapabilities: homeyRoomManagementCapabilities,
    entityRuntimeService: getHomeyEntityRuntimeService(),
    nativeActionFeatureService: homeyNativeActionFeatureService,
  };
}
