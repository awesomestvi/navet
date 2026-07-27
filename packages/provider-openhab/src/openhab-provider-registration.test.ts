import { runProviderPackageRegistrationTests } from '@navet/core/provider-package-test-suite';
import { createOpenHABProviderPackageRegistration } from './openhab-provider-registration';

runProviderPackageRegistrationTests({
  providerName: 'openHAB',
  providerId: 'openhab',
  createRegistration: () =>
    createOpenHABProviderPackageRegistration({
      getSession: () => null,
    }),
  expectedStatus: 'implemented',
  supportedFeatures: ['rooms', 'lighting', 'sensors'],
  unsupportedFeatures: ['mediaBrowse', 'calendar', 'weather', 'notifications'],
  expectedRoomManagementCapabilities: {
    discover: true,
    create: false,
    rename: false,
    assign: false,
    unassign: false,
    delete: false,
  },
});
