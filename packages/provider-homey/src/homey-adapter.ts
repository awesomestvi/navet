import {
  INTEGRATION_PROVIDERS,
  type NavetProviderContract,
  type NavetProviderSessionInput,
  type NavetProviderSessionMap,
} from '@navet/core';
import { createSnapshotBackedProviderAdapter } from '@navet/core/snapshot-backed-adapter';
import {
  ensureHomeyConfigured,
  executeHomeyCommand,
  getHomeySnapshot,
  loadHomeySnapshot,
  replaceHomeySnapshot,
  resetHomeySnapshot,
  subscribeHomeySnapshot,
} from './homey-bridge';
import { buildHomeyProviderState } from './homey-provider-state';
import type { HomeySnapshot } from './homey-types';

interface HomeyProviderSessionInput extends NavetProviderSessionInput {
  providerId: 'homey';
  homeySnapshot?: HomeySnapshot;
}

function getHomeyProviderSession(
  sessions: NavetProviderSessionMap
): HomeyProviderSessionInput | null {
  const session = sessions.homey;
  return session?.providerId === 'homey' ? (session as HomeyProviderSessionInput) : null;
}

function buildProviderSession(session: HomeyProviderSessionInput, connected: boolean) {
  return {
    providerId: session.providerId,
    connected,
    runtime: session.runtime,
    authMode: session.authMode,
  };
}

export function createHomeyProviderContract(): NavetProviderContract {
  return {
    providerId: 'homey',
    bootstrapSession: (sessions) => {
      const session = getHomeyProviderSession(sessions);
      return session ? buildProviderSession(session, getHomeySnapshot().connected) : null;
    },
    initializeSession: async (session) => {
      if (session.providerId !== 'homey') {
        return;
      }

      ensureHomeyConfigured();

      const homeySession = session as HomeyProviderSessionInput;
      if (homeySession.homeySnapshot) {
        replaceHomeySnapshot({
          connected: homeySession.homeySnapshot.connected,
          devices: homeySession.homeySnapshot.devices,
          zones: homeySession.homeySnapshot.zones,
        });
        return;
      }

      await loadHomeySnapshot();
    },
    teardownSession: () => {
      resetHomeySnapshot();
    },
    getState: () => buildHomeyProviderState(getHomeySnapshot()),
    subscribeState: (listener) => subscribeHomeySnapshot(() => listener()),
    resolveResource: (request) => ({
      id: request.deviceId,
      kind: 'unavailable',
      cacheKey: request.deviceId,
      authStrategy: 'none',
    }),
    normalizeResourceUrl: (resourceUrl) => resourceUrl,
  };
}

export function createHomeyContractAdapter(
  contract: NavetProviderContract = createHomeyProviderContract(),
  options: {
    getSession?: () => NavetProviderSessionInput | null | undefined;
  } = {}
) {
  return createSnapshotBackedProviderAdapter({
    providerId: 'homey',
    providerLabel: INTEGRATION_PROVIDERS.homey.label,
    contract,
    executeCommand: executeHomeyCommand,
    getSession: options.getSession,
  });
}
