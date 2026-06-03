import type { IntegrationSessionRuntimeRegistration } from '@navet/core/session-runtime-types';
import { getHomeAssistantSessionBridge } from './homeassistant-session-bridge';

export function createHomeAssistantSessionRuntimeRegistration(): IntegrationSessionRuntimeRegistration {
  const bridge = getHomeAssistantSessionBridge();

  return {
    getAuthRuntime: bridge.getAuthRuntime,
    getSnapshot: bridge.getSnapshot,
    getSession: bridge.getSession,
    subscribe: bridge.subscribe,
    init: bridge.init,
    login: bridge.login,
    logout: bridge.logout,
    refresh: bridge.refresh,
    invalidatePersistedSession: bridge.invalidatePersistedSession,
    replaceSession: bridge.replaceSession,
    setActiveProvider: bridge.setActiveProvider,
  };
}
