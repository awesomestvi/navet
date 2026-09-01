import { runProviderPackageRegistrationTests } from '@navet/core/provider-package-test-suite';
import { createSmartThingsProviderPackageRegistration } from './smartthings-provider-registration';

runProviderPackageRegistrationTests({
  providerName: 'SmartThings',
  providerId: 'smartthings',
  createRegistration: () =>
    createSmartThingsProviderPackageRegistration({
      getSession: () => null,
    }),
  expectedStatus: 'planned',
  unsupportedFeatures: [
    'rooms',
    'lighting',
    'sensors',
    'mediaBrowse',
    'calendar',
    'weather',
    'notifications',
    'conversation',
  ],
  expectedRoomManagementCapabilities: {
    discover: false,
    create: false,
    rename: false,
    assign: false,
    unassign: false,
    delete: false,
  },
});
