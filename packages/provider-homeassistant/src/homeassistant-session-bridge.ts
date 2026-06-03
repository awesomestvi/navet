import type { IntegrationSessionRuntimeRegistration } from '@navet/core/session-runtime-types';

type HomeAssistantSessionRuntimeBridge = Pick<
  IntegrationSessionRuntimeRegistration,
  | 'getAuthRuntime'
  | 'getSnapshot'
  | 'getSession'
  | 'subscribe'
  | 'init'
  | 'login'
  | 'logout'
  | 'refresh'
  | 'invalidatePersistedSession'
  | 'replaceSession'
  | 'setActiveProvider'
>;

let bridge: HomeAssistantSessionRuntimeBridge | null = null;

export function configureHomeAssistantSessionBridge(nextBridge: HomeAssistantSessionRuntimeBridge) {
  bridge = nextBridge;
}

export function getHomeAssistantSessionBridge(): HomeAssistantSessionRuntimeBridge {
  if (!bridge) {
    throw new Error('Home Assistant session bridge has not been configured');
  }

  return bridge;
}
