import { useStoreWithEqualityFn } from 'zustand/traditional';
import { type IntegrationStore, integrationStore } from '../stores/integration-store';

/**
 * Custom hook for current integration connection management.
 * Subscribe to the minimal integration store slice needed by a component.
 */
export const useHomeAssistant = <T>(
  selector: (state: IntegrationStore) => T,
  equalityFn?: (a: T, b: T) => boolean
): T => useStoreWithEqualityFn(integrationStore, selector, equalityFn);

export const useIntegrationStore = useHomeAssistant;
export const useCurrentIntegrationStore = useIntegrationStore;
