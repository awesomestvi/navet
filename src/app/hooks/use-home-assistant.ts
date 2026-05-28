import { useStoreWithEqualityFn } from 'zustand/traditional';
import { type HomeAssistantStore, homeAssistantStore } from '../stores/home-assistant-store';
import { useCurrentIntegrationStore, useIntegrationStore } from './use-integration-store';

// Compatibility shim for modules that still use Home Assistant naming.
export const useHomeAssistant = <T>(
  selector: (state: HomeAssistantStore) => T,
  equalityFn?: (a: T, b: T) => boolean
): T => useStoreWithEqualityFn(homeAssistantStore, selector, equalityFn);

export { useCurrentIntegrationStore, useIntegrationStore };
