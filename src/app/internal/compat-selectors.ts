import type { IntegrationStore } from '@/app/stores/integration-store';

// Compatibility-only selectors for app-internal migration consumers.
export const integrationCompatibilitySelectors = {
  providerSnapshots: (state: IntegrationStore) => state.providerSnapshots,
  devicesByCanonicalId: (state: IntegrationStore) => state.devicesByCanonicalId,
};
