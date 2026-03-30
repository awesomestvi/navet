import type { Connection, HassConfig, HassEntities, HassUser } from 'home-assistant-js-websocket';
import { createStore } from 'zustand/vanilla';
import {
  type HomeAssistantAreaRegistryEntry,
  type HomeAssistantConfiguration,
  type HomeAssistantDeviceRegistryEntry,
  type HomeAssistantEntityRegistryEntry,
  homeAssistantService,
} from '../services/home-assistant.service';

interface HomeAssistantState {
  connected: boolean;
  config: HassConfig | null;
  entities: HassEntities | null;
  user: HassUser | null;
  areas: HomeAssistantAreaRegistryEntry[];
  deviceRegistry: HomeAssistantDeviceRegistryEntry[];
  entityRegistry: HomeAssistantEntityRegistryEntry[];
  connection: Connection | null;
  error: string | null;
  connecting: boolean;
  reconnecting: boolean;
}

interface HomeAssistantActions {
  connect: (config: HomeAssistantConfiguration) => Promise<(() => void) | undefined>;
  disconnect: () => void;
  clearError: () => void;
}

export type HomeAssistantStore = HomeAssistantState & HomeAssistantActions;

const initialState: HomeAssistantState = {
  connected: false,
  config: null,
  entities: null,
  user: null,
  areas: [],
  deviceRegistry: [],
  entityRegistry: [],
  connection: null,
  error: null,
  connecting: false,
  reconnecting: false,
};

// Debounce window for entity state updates. Multiple HA entity changes arriving
// within this window are coalesced into a single Zustand set call, reducing
// React reconciler pressure during bursts (automations, energy sensors, etc.).
// The service always holds the latest HassEntities — only the notification is
// deferred, so getEntities() at flush time returns the most recent snapshot.
const ENTITY_DEBOUNCE_MS = 50;

export const homeAssistantStore = createStore<HomeAssistantStore>()((set, _get) => {
  let entityDebounceTimer: ReturnType<typeof setTimeout> | null = null;

  return {
    ...initialState,

    connect: async (config: HomeAssistantConfiguration) => {
      set({ connecting: true, error: null });

      try {
        // Subscribe to each typed event — only update the slice of state that changed
        const unsubscribers = [
          homeAssistantService.addListener('entities', (entities) => {
            if (entityDebounceTimer !== null) clearTimeout(entityDebounceTimer);
            entityDebounceTimer = setTimeout(() => {
              entityDebounceTimer = null;
              set({ entities });
            }, ENTITY_DEBOUNCE_MS);
          }),
          homeAssistantService.addListener('config', (config) => {
            set({ config });
          }),
          homeAssistantService.addListener(
            'registries',
            ({ areas, devices, entities: entityRegistry }) => {
              set({ areas, deviceRegistry: devices, entityRegistry });
            }
          ),
          homeAssistantService.addListener(
            'connection',
            ({ connected, connection, reconnecting }) => {
              set({ connected, connection, connecting: reconnecting, reconnecting });
            }
          ),
        ];
        const unsubscribe = () => {
          for (const fn of unsubscribers) fn();
        };

        // Authenticate and connect
        await homeAssistantService.authenticate(config);

        // Populate full initial state after connection
        set({
          connected: homeAssistantService.isConnected(),
          config: homeAssistantService.getConfig(),
          entities: homeAssistantService.getEntities(),
          user: homeAssistantService.getUser(),
          areas: homeAssistantService.getAreas(),
          deviceRegistry: homeAssistantService.getDeviceRegistry(),
          entityRegistry: homeAssistantService.getEntityRegistry(),
          connection: homeAssistantService.getConnection(),
          connecting: false,
          reconnecting: false,
        });

        return unsubscribe;
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : 'Failed to connect',
          connecting: false,
          reconnecting: false,
          connected: false,
        });
        throw error;
      }
    },

    disconnect: () => {
      homeAssistantService.disconnect();
      set(initialState);
    },

    clearError: () => {
      set({ error: null });
    },
  };
});
