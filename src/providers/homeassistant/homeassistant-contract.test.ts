import { integrationSessionRuntime } from '@navet/app/integration-session-runtime';
import { runProviderContractTests } from '@navet/core/contract-test-suite';
import { createProviderScopedId } from '@navet/core/ids';
import { createHomeAssistantContractAdapter } from '@navet/provider-homeassistant/homeassistant-adapter';
import { beforeEach, expect, vi } from 'vitest';
import {
  lightEntityFactory,
  lightEntityFixtures,
} from '@/test/fixtures/home-assistant/entities/light';

const {
  connectMock,
  disconnectMock,
  callServiceMock,
  homeAssistantState,
  homeAssistantListeners,
  emitHomeAssistantSnapshot,
} = vi.hoisted(() => {
  const listeners = {
    entities: new Set<() => void>(),
    registries: new Set<() => void>(),
    connection: new Set<() => void>(),
  };
  const state = {
    connected: true,
    entities: {} as Record<string, unknown>,
  };

  return {
    connectMock: vi.fn(),
    disconnectMock: vi.fn(),
    callServiceMock: vi.fn(),
    homeAssistantState: state,
    homeAssistantListeners: listeners,
    emitHomeAssistantSnapshot: () => {
      for (const listener of listeners.entities) {
        listener();
      }
    },
  };
});

vi.mock('@/app/stores/home-assistant-store', () => ({
  homeAssistantStore: {
    getState: () => ({
      connected: homeAssistantState.connected,
      config: null,
      entities: homeAssistantState.entities,
      user: null,
      areas: [],
      deviceRegistry: [],
      entityRegistry: [],
      registriesHydrated: true,
      connection: null,
      error: null,
      connecting: false,
      reconnecting: false,
      connect: connectMock,
      disconnect: disconnectMock,
      syncPanelHass: vi.fn(),
    }),
    subscribe: () => () => {},
  },
}));

vi.mock('@/app/services/home-assistant.service', () => ({
  homeAssistantService: {
    isConnected: () => homeAssistantState.connected,
    getEntities: () => homeAssistantState.entities,
    getAreas: () => [],
    getDeviceRegistry: () => [],
    getEntityRegistry: () => [],
    addListener: (event: 'entities' | 'registries' | 'connection', listener: () => void) => {
      const listeners = homeAssistantListeners[event];
      listeners.add(listener);
      return () => {
        listeners.delete(listener);
      };
    },
    callService: callServiceMock,
    signPath: vi.fn(),
    getCameraStreamUrl: vi.fn(),
  },
}));

beforeEach(() => {
  connectMock.mockReset();
  disconnectMock.mockReset();
  callServiceMock.mockReset();
  homeAssistantState.connected = true;
  homeAssistantState.entities = {
    'light.kitchen': lightEntityFixtures.normal,
  };
  for (const listeners of Object.values(homeAssistantListeners)) {
    listeners.clear();
  }
  integrationSessionRuntime.replaceSession(null);
});

runProviderContractTests({
  providerName: 'Home Assistant',
  createAdapter: () => createHomeAssistantContractAdapter(),
  setAuthenticatedSession: () => {
    integrationSessionRuntime.replaceSession({
      providerId: 'home_assistant',
      runtime: 'standalone-oauth',
      authMode: 'oauth',
      haBaseUrl: 'https://ha.example.test',
      hassUrl: 'https://ha.example.test',
    });
  },
  clearAuthenticatedSession: () => {
    integrationSessionRuntime.replaceSession(null);
  },
  createCommand: (entity) => ({
    type: 'turn_off',
    entityId: entity.id,
  }),
  expectConnected: () => {
    expect(connectMock).toHaveBeenCalledWith(
      expect.objectContaining({
        providerId: 'home_assistant',
      })
    );
  },
  expectDisconnected: () => {
    expect(disconnectMock).toHaveBeenCalled();
  },
  expectCommandDispatched: () => {
    expect(callServiceMock).toHaveBeenCalledWith(
      'light',
      'turn_off',
      {},
      { entity_id: 'light.kitchen' }
    );
  },
  getLookupIds: (entity) => [
    entity.externalId,
    createProviderScopedId('home_assistant', entity.externalId),
  ],
  emitEntityUpdate: () => {
    homeAssistantState.entities = {
      'light.kitchen': lightEntityFactory({
        brightness: 42,
      }),
    };
    emitHomeAssistantSnapshot();
  },
  emitEntityAdded: () => {
    homeAssistantState.entities = {
      ...homeAssistantState.entities,
      'light.entryway': lightEntityFactory({
        friendly_name: 'Entryway Light',
      }),
    };
    emitHomeAssistantSnapshot();
  },
  emitEntityRemoved: () => {
    const nextEntities = { ...homeAssistantState.entities };
    delete nextEntities['light.kitchen'];
    homeAssistantState.entities = nextEntities;
    emitHomeAssistantSnapshot();
  },
  setUnavailableSnapshot: () => {
    homeAssistantState.entities = {
      'light.kitchen': lightEntityFactory({
        state: 'unavailable',
      }),
    };
  },
  setMalformedSnapshot: () => {
    homeAssistantState.entities = {
      'light.kitchen': lightEntityFixtures.normal,
      broken_entity: {} as never,
    };
  },
});
