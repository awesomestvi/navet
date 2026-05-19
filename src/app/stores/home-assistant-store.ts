import type { Connection, HassConfig, HassEntities, HassUser } from 'home-assistant-js-websocket';
import { createStore } from 'zustand/vanilla';
import {
  type HomeAssistantAreaRegistryEntry,
  type HomeAssistantConfiguration,
  type HomeAssistantDeviceRegistryEntry,
  type HomeAssistantEntityRegistryEntry,
  homeAssistantService,
} from '../services/home-assistant.service';
import type { HomeAssistantPanelHass } from '../services/home-assistant-panel-adapter';
import { useErrorStore } from './error-store';

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
  connect: (config: HomeAssistantConfiguration) => Promise<void>;
  syncPanelHass: (hass: HomeAssistantPanelHass) => void;
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
const HA_CONNECTION_GRACE_PERIOD_MS = 10_000;
const HA_CONNECTION_TIMEOUT_MESSAGE =
  'Cannot connect to Home Assistant. Check the saved URL and update it if your Home Assistant address changed.';

export const homeAssistantStore = createStore<HomeAssistantStore>()((set, _get) => {
  let entityDebounceTimer: ReturnType<typeof setTimeout> | null = null;
  let connectionGraceTimer: ReturnType<typeof setTimeout> | null = null;
  let activeServiceUnsubscribe: (() => void) | null = null;
  let panelRegistryLoadStarted = false;
  let connectAttemptId = 0;

  const clearEntityDebounce = () => {
    if (entityDebounceTimer !== null) {
      clearTimeout(entityDebounceTimer);
      entityDebounceTimer = null;
    }
  };

  const clearConnectionGraceTimer = () => {
    if (connectionGraceTimer !== null) {
      clearTimeout(connectionGraceTimer);
      connectionGraceTimer = null;
    }
  };

  const clearServiceSubscriptions = () => {
    activeServiceUnsubscribe?.();
    activeServiceUnsubscribe = null;
    clearEntityDebounce();
  };

  const getConnectionTimeoutDetails = (config: HomeAssistantConfiguration) => {
    const url = config.hassUrl ?? 'unknown Home Assistant URL';
    return `Saved Home Assistant URL did not respond within ${HA_CONNECTION_GRACE_PERIOD_MS / 1000} seconds: ${url}`;
  };

  return {
    ...initialState,

    connect: async (config: HomeAssistantConfiguration) => {
      const attemptId = ++connectAttemptId;
      clearConnectionGraceTimer();
      set({ connecting: true, error: null });
      useErrorStore.getState().clearError();
      clearServiceSubscriptions();

      const connectionTimeout = new Promise<'timed-out'>((resolve) => {
        connectionGraceTimer = setTimeout(() => {
          if (attemptId !== connectAttemptId) {
            return;
          }

          connectAttemptId += 1;
          connectionGraceTimer = null;
          clearServiceSubscriptions();
          homeAssistantService.disconnect();

          const details = getConnectionTimeoutDetails(config);
          set({
            error: HA_CONNECTION_TIMEOUT_MESSAGE,
            connected: false,
            connection: null,
            connecting: false,
            reconnecting: false,
          });
          useErrorStore.getState().setError(HA_CONNECTION_TIMEOUT_MESSAGE, details);
          resolve('timed-out');
        }, HA_CONNECTION_GRACE_PERIOD_MS);
      });

      try {
        // Subscribe to each typed event — only update the slice of state that changed
        const unsubscribers = [
          homeAssistantService.addListener('entities', (entities) => {
            if (attemptId !== connectAttemptId) {
              return;
            }
            clearEntityDebounce();
            entityDebounceTimer = setTimeout(() => {
              if (attemptId !== connectAttemptId) {
                return;
              }
              entityDebounceTimer = null;
              set({ entities });
            }, ENTITY_DEBOUNCE_MS);
          }),
          homeAssistantService.addListener('config', (config) => {
            if (attemptId !== connectAttemptId) {
              return;
            }
            set({ config });
          }),
          homeAssistantService.addListener(
            'registries',
            ({ areas, devices, entities: entityRegistry }) => {
              if (attemptId !== connectAttemptId) {
                return;
              }
              set({ areas, deviceRegistry: devices, entityRegistry });
            }
          ),
          homeAssistantService.addListener(
            'connection',
            ({ connected, connection, reconnecting }) => {
              if (attemptId !== connectAttemptId) {
                return;
              }
              set({ connected, connection, connecting: reconnecting, reconnecting });
            }
          ),
          homeAssistantService.addListener('error', ({ message }) => {
            if (attemptId !== connectAttemptId) {
              return;
            }
            set({
              error: message,
              connecting: false,
              reconnecting: false,
              connected: false,
            });
            useErrorStore.getState().setError(message);
          }),
        ];
        const unsubscribe = () => {
          for (const fn of unsubscribers) fn();
          clearEntityDebounce();
        };
        activeServiceUnsubscribe = unsubscribe;

        // Authenticate and connect
        const result = await Promise.race([
          homeAssistantService.authenticate(config).then(() => 'connected' as const),
          connectionTimeout,
        ]);
        if (result === 'timed-out') {
          return;
        }

        // Populate full initial state after connection
        if (attemptId !== connectAttemptId) {
          return;
        }

        clearConnectionGraceTimer();
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
      } catch (error) {
        if (attemptId !== connectAttemptId) {
          return;
        }

        clearConnectionGraceTimer();
        clearServiceSubscriptions();
        const message =
          error instanceof Error
            ? error.message
            : typeof error === 'string'
              ? error
              : 'Failed to connect';
        set({
          error: message,
          connecting: false,
          reconnecting: false,
          connected: false,
        });
        useErrorStore.getState().setError(message);
        throw error;
      }
    },

    syncPanelHass: (hass: HomeAssistantPanelHass) => {
      connectAttemptId += 1;
      clearConnectionGraceTimer();
      clearServiceSubscriptions();
      homeAssistantService.setPanelHass(hass);
      useErrorStore.getState().clearError();

      set({
        connected: true,
        config: homeAssistantService.getConfig(),
        entities: homeAssistantService.getEntities(),
        user: homeAssistantService.getUser(),
        connection: homeAssistantService.getConnection(),
        error: null,
        connecting: false,
        reconnecting: false,
      });

      if (panelRegistryLoadStarted) {
        return;
      }

      panelRegistryLoadStarted = true;
      void homeAssistantService
        .loadRegistries()
        .then(() => {
          set({
            areas: homeAssistantService.getAreas(),
            deviceRegistry: homeAssistantService.getDeviceRegistry(),
            entityRegistry: homeAssistantService.getEntityRegistry(),
          });
        })
        .catch((error) => {
          console.error('[HomeAssistantStore] Failed to load panel registries:', error);
          panelRegistryLoadStarted = false;
        });
    },

    disconnect: () => {
      connectAttemptId += 1;
      clearConnectionGraceTimer();
      useErrorStore.getState().clearError();
      clearServiceSubscriptions();
      panelRegistryLoadStarted = false;
      homeAssistantService.disconnect();
      set(initialState);
    },

    clearError: () => {
      useErrorStore.getState().clearError();
      set({ error: null });
    },
  };
});
