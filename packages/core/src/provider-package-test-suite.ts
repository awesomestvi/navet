import { describe, expect, it } from 'vitest';
import type { IntegrationProviderId } from './integration-providers';
import type { ProviderRoomManagementCapabilities } from './provider-feature-models';
import type {
  IntegrationProviderFeature,
  IntegrationProviderRuntimeRegistration,
  ProviderPackageRegistration,
} from './provider-runtime-types';

interface ProviderPackageTestOptions {
  providerName: string;
  providerId: IntegrationProviderId;
  createRegistration: () => ProviderPackageRegistration;
  expectedStatus: IntegrationProviderRuntimeRegistration['implementationStatus'];
  supportedFeatures?: IntegrationProviderFeature[];
  unsupportedFeatures?: IntegrationProviderFeature[];
  expectedRoomManagementCapabilities?: Omit<ProviderRoomManagementCapabilities, 'providerId'>;
}

export function runProviderPackageRegistrationTests(options: ProviderPackageTestOptions) {
  describe(`${options.providerName} provider package registration`, () => {
    it('exposes a stable package registration surface', () => {
      const registration = options.createRegistration();

      expect(registration.contract.providerId).toBe(options.providerId);
      expect(registration.runtimeRegistration.contract).toBe(registration.contract);
      expect(registration.runtimeRegistration.providerContractAdapter).toBe(
        registration.providerContractAdapter
      );
      expect(registration.runtimeRegistration.implementationStatus).toBe(options.expectedStatus);
    });

    it('declares the expected provider feature posture', () => {
      const runtimeRegistration = options.createRegistration().runtimeRegistration;
      const matrix = runtimeRegistration.featureMatrix;

      for (const feature of options.supportedFeatures ?? []) {
        expect(matrix[feature]).toBe(true);
      }

      for (const feature of options.unsupportedFeatures ?? []) {
        expect(matrix[feature]).toBe(false);
      }

      if (options.expectedRoomManagementCapabilities) {
        expect(runtimeRegistration.roomManagementCapabilities).toEqual({
          providerId: options.providerId,
          ...options.expectedRoomManagementCapabilities,
        });
        expect(matrix.rooms).toBe(options.expectedRoomManagementCapabilities.discover);

        const supportsRoomMutation = (
          ['create', 'rename', 'assign', 'unassign', 'delete'] as const
        ).some((capability) => options.expectedRoomManagementCapabilities?.[capability]);
        expect(Boolean(runtimeRegistration.adminFeatureService)).toBe(supportsRoomMutation);
      }
    });
  });
}
