import type { ProviderHubSnapshot } from '@navet/core/provider-hub';
import { createProviderRoomManagementCapabilities } from '@navet/core/provider-room-management';
import type {
  IntegrationProviderRuntimeRegistration,
  ProviderContractRegistration,
} from '@navet/core/provider-runtime-types';
import { callHomeyService, getHomeyEntityRuntimeService } from './homey-bridge';
import { homeyHistoryFeatureService, homeyHubFeatureService } from './homey-hub.service';
import { homeyNativeActionFeatureService } from './homey-native-action-feature.service';
import { homeyNotificationFeatureService } from './homey-notification-feature.service';
import { homeySecurityFeatureService } from './homey-security-feature.service';

export const homeyRoomManagementCapabilities = createProviderRoomManagementCapabilities('homey', {
  discover: true,
});

export function createHomeyRuntimeRegistration(
  registration: ProviderContractRegistration,
  getAccountMetadata?: () => Pick<ProviderHubSnapshot, 'profile'> & {
    installations: ProviderHubSnapshot['sections']['installations'];
  }
): IntegrationProviderRuntimeRegistration {
  const withAccount = (snapshot: ProviderHubSnapshot): ProviderHubSnapshot => {
    const metadata = getAccountMetadata?.();
    return metadata
      ? {
          ...snapshot,
          profile: metadata.profile ?? snapshot.profile,
          sections: { ...snapshot.sections, installations: metadata.installations },
        }
      : snapshot;
  };
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
      climate: true,
      mediaControls: true,
      mediaBrowse: false,
      mediaArtwork: false,
      cameraSnapshot: false,
      cameraStreams: false,
      energyNow: false,
      calendar: false,
      weather: false,
      notifications: true,
      tasks: false,
      conversation: false,
    },
    roomManagementCapabilities: homeyRoomManagementCapabilities,
    entityRuntimeService: getHomeyEntityRuntimeService(),
    nativeActionFeatureService: homeyNativeActionFeatureService,
    securityFeatureService: homeySecurityFeatureService,
    climateFeatureService: {
      setTargetTemperature: async (entityId, update) => {
        if (update.targetTemperatureLow !== undefined || update.targetTemperatureHigh !== undefined)
          throw new Error('Homey thermostats support a single target temperature');
        await callHomeyService(
          'climate',
          'set_temperature',
          { temperature: update.temperature },
          { entityId }
        );
      },
    },
    hubFeatureService: {
      ...homeyHubFeatureService,
      getSnapshot: async () => withAccount(await homeyHubFeatureService.getSnapshot()),
      refresh: async () => withAccount(await homeyHubFeatureService.refresh()),
    },
    historyFeatureService: homeyHistoryFeatureService,
    notificationFeatureService: homeyNotificationFeatureService,
  };
}
