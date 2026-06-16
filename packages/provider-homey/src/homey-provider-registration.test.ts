import { runProviderPackageRegistrationTests } from '@navet/core/provider-package-test-suite';
import { vi } from 'vitest';
import { createHomeyProviderPackageRegistration } from './homey-provider-registration';

runProviderPackageRegistrationTests({
  providerName: 'Homey',
  providerId: 'homey',
  createRegistration: () =>
    createHomeyProviderPackageRegistration({
      getSession: () => null,
      bridge: {
        ensureConfigured: vi.fn(),
        getSnapshot: () => ({ connected: false, devices: {}, zones: {} }),
        loadSnapshot: vi.fn(async () => ({ connected: false, devices: {}, zones: {} })),
        replaceSnapshot: vi.fn(),
        resetSnapshot: vi.fn(),
        subscribe: vi.fn(() => () => {}),
        callService: vi.fn(async () => undefined),
        entityRuntimeService: {
          getEntitySnapshots: () => null,
          subscribeEntitySnapshots: () => () => {},
          getEntityRegistryEntries: () => [],
          subscribeEntityRegistryEntries: () => () => {},
          getConfig: () => null,
          subscribeConfig: () => () => {},
        },
      },
    }),
  expectedStatus: 'implemented',
  supportedFeatures: ['rooms', 'lighting', 'sensors'],
  unsupportedFeatures: ['mediaBrowse', 'calendar', 'weather', 'notifications'],
});
