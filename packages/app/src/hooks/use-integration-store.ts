import { useStoreWithEqualityFn } from 'zustand/traditional';
import { type IntegrationStore, integrationStore } from '../stores/integration-store';
import type { IntegrationProviderId } from '../types/provider';

export const useIntegrationStore = <T>(
  selector: (state: IntegrationStore) => T,
  equalityFn?: (a: T, b: T) => boolean
): T => useStoreWithEqualityFn(integrationStore, selector, equalityFn);

export const useCurrentIntegrationStore = useIntegrationStore;

export const useProviderId = (providerId?: IntegrationProviderId): IntegrationProviderId =>
  useIntegrationStore((state) => providerId ?? state.currentProviderId);
