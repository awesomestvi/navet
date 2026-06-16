import { runProviderPackageRegistrationTests } from '@navet/core/provider-package-test-suite';
import { createHubitatProviderPackageRegistration } from './hubitat-provider-registration';

runProviderPackageRegistrationTests({
  providerName: 'Hubitat',
  providerId: 'hubitat',
  createRegistration: () =>
    createHubitatProviderPackageRegistration({
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
