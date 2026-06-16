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
  ],
});
