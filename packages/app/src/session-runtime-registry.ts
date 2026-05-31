import { authSessionManager } from '@navet/app/infrastructure/home-assistant/auth/auth-session-manager';
import { toLegacyAuthRuntime } from '@navet/app/infrastructure/home-assistant/runtime/runtime-context';
import { getRuntimeContext } from '@navet/app/infrastructure/home-assistant/runtime/runtime-detector';
import { configureHomeAssistantSessionBridge } from '@navet/provider-homeassistant/homeassistant-session-bridge';
import { createHomeAssistantSessionRuntimeRegistration } from '@navet/provider-homeassistant/homeassistant-session-runtime';
import { fromProviderSessionInput, toAuthCompatibleSession } from './auth/types';
import type { IntegrationSessionRuntimeRegistration } from './session-runtime-types';

let registration: IntegrationSessionRuntimeRegistration | null = null;

export function getIntegrationSessionRuntimeRegistration(): IntegrationSessionRuntimeRegistration {
  if (registration) {
    return registration;
  }

  configureHomeAssistantSessionBridge({
    getAuthRuntime: () => toLegacyAuthRuntime(getRuntimeContext().kind),
    getSnapshot: () => authSessionManager.getSnapshot(),
    getSession: () => toAuthCompatibleSession(authSessionManager.getSession()),
    subscribe: (listener) =>
      authSessionManager.subscribe((snapshot, session) =>
        listener(snapshot, toAuthCompatibleSession(session))
      ),
    init: async () => await authSessionManager.init(),
    login: async (input) =>
      await authSessionManager.login({
        haBaseUrl: input?.haBaseUrl,
        hassUrl: input?.hassUrl,
        accessToken: input?.accessToken,
        providerId: input?.providerId,
      }),
    logout: async (providerId) => {
      await authSessionManager.logout(providerId);
    },
    refresh: async (providerId) => await authSessionManager.refresh(providerId),
    replaceSession: (session) =>
      authSessionManager.replaceSession(fromProviderSessionInput(session)),
    setActiveProvider: (providerId) => authSessionManager.setActiveProvider(providerId),
  });
  registration = createHomeAssistantSessionRuntimeRegistration();
  return registration;
}
