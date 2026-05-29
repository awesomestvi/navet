import type { ProviderContractRegistration } from '@navet/app/provider-registration-types';
import type { IntegrationProviderRuntimeRegistration } from '@navet/app/provider-runtime-types';
import { homeyService } from '@/app/services/homey.service';
import { homeyEntityRuntimeService } from '@/app/services/homey-entity-runtime.service';

export function createHomeyRuntimeRegistration(
  registration: ProviderContractRegistration
): IntegrationProviderRuntimeRegistration {
  return {
    providerContractAdapter: registration.providerContractAdapter,
    contract: registration.contract,
    implementationStatus: 'implemented',
    capabilities: {
      serviceActions: true,
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
    callService: async (domain, service, serviceData = {}, target) =>
      await homeyService.callService(domain, service, serviceData, target),
    entityRuntimeService: homeyEntityRuntimeService,
  };
}
