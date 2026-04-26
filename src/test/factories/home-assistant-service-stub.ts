import { vi } from 'vitest';
import type {
  HAServiceEventMap,
  HAServiceEventType,
  HomeAssistantAreaRegistryEntry,
  HomeAssistantConfiguration,
  HomeAssistantDeviceRegistryEntry,
  HomeAssistantEntityRegistryEntry,
} from '@/app/services/home-assistant.service';

type ListenerMap = {
  [K in HAServiceEventType]: Set<(payload: HAServiceEventMap[K]) => void>;
};

export function createHomeAssistantServiceStub() {
  const listeners: ListenerMap = {
    entities: new Set(),
    config: new Set(),
    registries: new Set(),
    connection: new Set(),
  };

  let connected = false;
  let config: HAServiceEventMap['config'] | null = null;
  let entities: HAServiceEventMap['entities'] | null = null;
  let user: unknown = null;
  let connection: HAServiceEventMap['connection']['connection'] = null;
  let areas: HomeAssistantAreaRegistryEntry[] = [];
  let deviceRegistry: HomeAssistantDeviceRegistryEntry[] = [];
  let entityRegistry: HomeAssistantEntityRegistryEntry[] = [];

  const authenticate = vi.fn(async (nextConfig: HomeAssistantConfiguration) => {
    connected = true;
    return nextConfig;
  });

  const disconnect = vi.fn(() => {
    connected = false;
    connection = null;
  });

  return {
    addListener: vi.fn(
      <K extends HAServiceEventType>(
        type: K,
        listener: (payload: HAServiceEventMap[K]) => void
      ) => {
        listeners[type].add(listener);
        return () => listeners[type].delete(listener);
      }
    ),
    authenticate,
    disconnect,
    isConnected: vi.fn(() => connected),
    getConfig: vi.fn(() => config),
    getEntities: vi.fn(() => entities),
    getUser: vi.fn(() => user),
    getAreas: vi.fn(() => areas),
    getDeviceRegistry: vi.fn(() => deviceRegistry),
    getEntityRegistry: vi.fn(() => entityRegistry),
    getConnection: vi.fn(() => connection),
    emit<K extends HAServiceEventType>(type: K, payload: HAServiceEventMap[K]) {
      if (type === 'entities') {
        entities = payload as HAServiceEventMap['entities'];
      } else if (type === 'config') {
        config = payload as HAServiceEventMap['config'];
      } else if (type === 'connection') {
        const connectionPayload = payload as HAServiceEventMap['connection'];
        connected = connectionPayload.connected;
        connection = connectionPayload.connection;
      } else if (type === 'registries') {
        const registriesPayload = payload as HAServiceEventMap['registries'];
        areas = registriesPayload.areas;
        deviceRegistry = registriesPayload.devices;
        entityRegistry = registriesPayload.entities;
      }
      listeners[type].forEach((listener) => {
        listener(payload);
      });
    },
    setSnapshots(next: {
      connected?: boolean;
      config?: HAServiceEventMap['config'];
      entities?: HAServiceEventMap['entities'];
      user?: unknown;
      connection?: HAServiceEventMap['connection']['connection'];
      areas?: HomeAssistantAreaRegistryEntry[];
      deviceRegistry?: HomeAssistantDeviceRegistryEntry[];
      entityRegistry?: HomeAssistantEntityRegistryEntry[];
    }) {
      connected = next.connected ?? connected;
      config = next.config ?? config;
      entities = next.entities ?? entities;
      user = next.user ?? user;
      connection = next.connection ?? connection;
      areas = next.areas ?? areas;
      deviceRegistry = next.deviceRegistry ?? deviceRegistry;
      entityRegistry = next.entityRegistry ?? entityRegistry;
    },
  };
}
