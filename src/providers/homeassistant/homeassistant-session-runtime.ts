import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import { toLegacyAuthRuntime } from '@/app/infrastructure/home-assistant/runtime/runtime-context';
import { getRuntimeContext } from '@/app/infrastructure/home-assistant/runtime/runtime-detector';
import type { IntegrationSessionRuntimeRegistration } from '@/auth/session-runtime-types';

export function createHomeAssistantSessionRuntimeRegistration(): IntegrationSessionRuntimeRegistration {
  return {
    getAuthRuntime: () => toLegacyAuthRuntime(getRuntimeContext().kind),
    getSnapshot: () => authSessionManager.getSnapshot(),
    getSession: () => authSessionManager.getSession(),
    subscribe: (listener) => authSessionManager.subscribe(listener),
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
    replaceSession: (session) => authSessionManager.replaceSession(session),
    setActiveProvider: (providerId) => authSessionManager.setActiveProvider(providerId),
  };
}
