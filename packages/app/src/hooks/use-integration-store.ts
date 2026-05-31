import { useStoreWithEqualityFn } from 'zustand/traditional';
import { type IntegrationStore, integrationStore } from '../stores/integration-store';

export const useIntegrationStore = <T>(
  selector: (state: IntegrationStore) => T,
  equalityFn?: (a: T, b: T) => boolean
): T => useStoreWithEqualityFn(integrationStore, selector, equalityFn);

export const useCurrentIntegrationStore = useIntegrationStore;
