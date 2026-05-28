import { useCurrentIntegrationStore, useIntegrationStore } from './use-integration-store';

// Compatibility shim for modules that still use Home Assistant naming.
export const useHomeAssistant = useIntegrationStore;

export { useCurrentIntegrationStore, useIntegrationStore };
