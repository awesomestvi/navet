import { createStore } from 'zustand/vanilla';
import type {
  NavetDevice,
  NavetProviderSession,
  NavetProviderSnapshot,
  NavetRoom,
} from '@/app/core/navet';
import {
  buildHomeAssistantNavetRooms,
  buildHomeyNavetRooms,
  mapHomeAssistantEntitiesToNavetDevices,
  mapHomeySnapshotToNavetDevices,
} from '@/app/core/navet-mappers';
import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import type { ProviderHealth } from '@/app/platform/types';
import { homeyService } from '@/app/services/homey.service';
import { listIntegrationProviderAdapters } from '@/app/services/integration-registry.service';
import type { IntegrationUser } from '@/app/types/integration-user';
import type { IntegrationProviderId } from '@/app/types/provider';
import {
  type HomeAssistantActions,
  type HomeAssistantState,
  type HomeAssistantStore,
  homeAssistantStore,
} from './home-assistant-store';

export interface HomeAssistantRuntimeSlice extends HomeAssistantState {
  actions: Pick<HomeAssistantActions, 'connect' | 'syncPanelHass' | 'disconnect' | 'clearError'>;
}

export interface HomeyRuntimeSlice {
  connected: boolean;
}

interface IntegrationRuntimeState {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
  config: HomeAssistantStore['config'];
  entities: HomeAssistantStore['entities'];
  user: IntegrationUser | null;
  areas: HomeAssistantStore['areas'];
  deviceRegistry: HomeAssistantStore['deviceRegistry'];
  entityRegistry: HomeAssistantStore['entityRegistry'];
  registriesHydrated: boolean;
  connection: HomeAssistantStore['connection'];
  error: string | null;
  homeAssistant: HomeAssistantRuntimeSlice;
  homey: HomeyRuntimeSlice;
  availableProviderIds: IntegrationProviderId[];
  selectedProviderIds: IntegrationProviderId[];
  providerHealth: Record<IntegrationProviderId, ProviderHealth>;
  providers: IntegrationProviderId[];
  providerSessions: Partial<Record<IntegrationProviderId, NavetProviderSession>>;
  providerSnapshots: Partial<Record<IntegrationProviderId, NavetProviderSnapshot>>;
  devicesByCanonicalId: Record<string, NavetDevice>;
  roomsByCanonicalId: Record<string, NavetRoom>;
  connect: HomeAssistantStore['connect'];
  syncPanelHass: HomeAssistantStore['syncPanelHass'];
  disconnect: HomeAssistantStore['disconnect'];
  clearError: HomeAssistantStore['clearError'];
  setSelectedProviders: (providerIds: IntegrationProviderId[]) => void;
  setIntegrationUser: (user: IntegrationUser | null) => void;
  setProviderSessions: (
    sessions: Partial<Record<IntegrationProviderId, NavetProviderSession>>
  ) => void;
}

export type IntegrationStore = IntegrationRuntimeState;

function getProviderSessionsSnapshot(): Partial<
  Record<IntegrationProviderId, NavetProviderSession>
> {
  const snapshot = authSessionManager.getSnapshot();

  return Object.fromEntries(
    Object.entries(snapshot.sessions).map(([providerId, session]) => [
      providerId,
      {
        providerId: session.providerId,
        connected: session.providerId === 'home_assistant' ? true : Boolean(session),
        runtime: session.runtime,
        authMode: session.authMode,
      },
    ])
  ) as Partial<Record<IntegrationProviderId, NavetProviderSession>>;
}

function buildProviderSnapshots(homeAssistantState: HomeAssistantStore): {
  providerSnapshots: Partial<Record<IntegrationProviderId, NavetProviderSnapshot>>;
  devicesByCanonicalId: Record<string, NavetDevice>;
  roomsByCanonicalId: Record<string, NavetRoom>;
} {
  const homeAssistantDevices = mapHomeAssistantEntitiesToNavetDevices({
    entities: homeAssistantState.entities,
    areas: homeAssistantState.areas,
    deviceRegistry: homeAssistantState.deviceRegistry,
    entityRegistry: homeAssistantState.entityRegistry,
  });
  const homeAssistantRooms = buildHomeAssistantNavetRooms({
    entities: homeAssistantState.entities,
    areas: homeAssistantState.areas,
    deviceRegistry: homeAssistantState.deviceRegistry,
    entityRegistry: homeAssistantState.entityRegistry,
  });
  const homeySnapshot = homeyService.getSnapshot();
  const homeyDevices = mapHomeySnapshotToNavetDevices(homeySnapshot);
  const homeyRooms = buildHomeyNavetRooms(homeySnapshot);

  const providerSnapshots: Partial<Record<IntegrationProviderId, NavetProviderSnapshot>> = {
    home_assistant: {
      providerId: 'home_assistant',
      connected: homeAssistantState.connected,
      devices: homeAssistantDevices,
      rooms: homeAssistantRooms,
    },
    homey: {
      providerId: 'homey',
      connected: homeySnapshot.connected,
      devices: homeyDevices,
      rooms: homeyRooms,
    },
  };

  const devicesByCanonicalId: Record<string, NavetDevice> = {};
  const roomsByCanonicalId: Record<string, NavetRoom> = {};

  for (const providerSnapshot of Object.values(providerSnapshots)) {
    if (!providerSnapshot) {
      continue;
    }

    for (const device of providerSnapshot.devices) {
      devicesByCanonicalId[device.canonicalId] = device;
    }

    for (const room of providerSnapshot.rooms) {
      roomsByCanonicalId[room.canonicalId] = room;
    }
  }

  return {
    providerSnapshots,
    devicesByCanonicalId,
    roomsByCanonicalId,
  };
}

function getInitialProviderHealth(): Record<IntegrationProviderId, ProviderHealth> {
  return Object.fromEntries(
    listIntegrationProviderAdapters().map((adapter) => [
      adapter.provider.id,
      {
        providerId: adapter.provider.id,
        connected: false,
        connecting: false,
        reconnecting: false,
        implementationStatus: adapter.implementationStatus,
        lastError: null,
      },
    ])
  ) as Record<IntegrationProviderId, ProviderHealth>;
}

function createProviderHealthFromHomeAssistant(
  state: HomeAssistantStore,
  implementationStatus: ProviderHealth['implementationStatus']
): ProviderHealth {
  return {
    providerId: 'home_assistant',
    connected: state.connected,
    connecting: state.connecting,
    reconnecting: state.reconnecting,
    implementationStatus,
    lastError: state.error,
  };
}

function createProviderHealthFromHomey(
  implementationStatus: ProviderHealth['implementationStatus']
): ProviderHealth {
  const snapshot = homeyService.getSnapshot();

  return {
    providerId: 'homey',
    connected: snapshot.connected,
    connecting: false,
    reconnecting: false,
    implementationStatus,
    lastError: null,
  };
}

function getImplementationStatus(
  providerId: IntegrationProviderId
): ProviderHealth['implementationStatus'] {
  return (
    listIntegrationProviderAdapters().find((adapter) => adapter.provider.id === providerId)
      ?.implementationStatus ?? 'planned'
  );
}

export const integrationStore = createStore<IntegrationStore>()((set) => {
  const mapHomeAssistantSlice = (state: HomeAssistantStore): HomeAssistantRuntimeSlice => ({
    connected: state.connected,
    config: state.config,
    entities: state.entities,
    user: state.user,
    areas: state.areas,
    deviceRegistry: state.deviceRegistry,
    entityRegistry: state.entityRegistry,
    registriesHydrated: state.registriesHydrated,
    connection: state.connection,
    error: state.error,
    connecting: state.connecting,
    reconnecting: state.reconnecting,
    actions: {
      connect: state.connect,
      syncPanelHass: state.syncPanelHass,
      disconnect: state.disconnect,
      clearError: state.clearError,
    },
  });

  const syncHomeAssistantState = (state: HomeAssistantStore) => {
    const homeAssistant = mapHomeAssistantSlice(state);
    const { providerSnapshots, devicesByCanonicalId, roomsByCanonicalId } =
      buildProviderSnapshots(state);

    set((current) => ({
      ...current,
      connected: state.connected,
      config: state.config,
      entities: state.entities,
      user: current.user ?? state.user,
      areas: state.areas,
      deviceRegistry: state.deviceRegistry,
      entityRegistry: state.entityRegistry,
      registriesHydrated: state.registriesHydrated,
      connection: state.connection,
      error: state.error,
      connecting: state.connecting,
      reconnecting: state.reconnecting,
      homeAssistant,
      providerSnapshots,
      devicesByCanonicalId,
      roomsByCanonicalId,
      providerHealth: {
        ...current.providerHealth,
        home_assistant: createProviderHealthFromHomeAssistant(
          state,
          getImplementationStatus('home_assistant')
        ),
      },
    }));
  };

  const syncHomeyState = () => {
    const snapshot = homeyService.getSnapshot();
    const homeAssistantState = homeAssistantStore.getState();
    const { providerSnapshots, devicesByCanonicalId, roomsByCanonicalId } =
      buildProviderSnapshots(homeAssistantState);

    set((current) => ({
      ...current,
      homey: {
        connected: snapshot.connected,
      },
      providerSnapshots,
      devicesByCanonicalId,
      roomsByCanonicalId,
      providerHealth: {
        ...current.providerHealth,
        homey: createProviderHealthFromHomey(getImplementationStatus('homey')),
      },
    }));
  };

  const currentHomeAssistantState = homeAssistantStore.getState();
  const initialCanonicalState = buildProviderSnapshots(currentHomeAssistantState);
  const initialProviderHealth = {
    ...getInitialProviderHealth(),
    home_assistant: createProviderHealthFromHomeAssistant(
      currentHomeAssistantState,
      getImplementationStatus('home_assistant')
    ),
    homey: createProviderHealthFromHomey(getImplementationStatus('homey')),
  };

  homeAssistantStore.subscribe(syncHomeAssistantState);
  homeyService.subscribe(syncHomeyState);

  const initialHomeAssistantSlice = mapHomeAssistantSlice(currentHomeAssistantState);

  return {
    connected: currentHomeAssistantState.connected,
    config: currentHomeAssistantState.config,
    entities: currentHomeAssistantState.entities,
    user: currentHomeAssistantState.user,
    areas: currentHomeAssistantState.areas,
    deviceRegistry: currentHomeAssistantState.deviceRegistry,
    entityRegistry: currentHomeAssistantState.entityRegistry,
    registriesHydrated: currentHomeAssistantState.registriesHydrated,
    connection: currentHomeAssistantState.connection,
    error: currentHomeAssistantState.error,
    connecting: currentHomeAssistantState.connecting,
    reconnecting: currentHomeAssistantState.reconnecting,
    homeAssistant: initialHomeAssistantSlice,
    homey: {
      connected: homeyService.getSnapshot().connected,
    },
    availableProviderIds: listIntegrationProviderAdapters().map((adapter) => adapter.provider.id),
    providers: listIntegrationProviderAdapters().map((adapter) => adapter.provider.id),
    selectedProviderIds: ['home_assistant', 'homey'],
    providerSessions: getProviderSessionsSnapshot(),
    providerSnapshots: initialCanonicalState.providerSnapshots,
    devicesByCanonicalId: initialCanonicalState.devicesByCanonicalId,
    roomsByCanonicalId: initialCanonicalState.roomsByCanonicalId,
    providerHealth: initialProviderHealth,
    connect: initialHomeAssistantSlice.actions.connect,
    syncPanelHass: initialHomeAssistantSlice.actions.syncPanelHass,
    disconnect: initialHomeAssistantSlice.actions.disconnect,
    clearError: initialHomeAssistantSlice.actions.clearError,
    setSelectedProviders: (providerIds) =>
      set({
        selectedProviderIds: Array.from(new Set(providerIds)),
      }),
    setIntegrationUser: (user) => set({ user }),
    setProviderSessions: (sessions) =>
      set((current) => ({
        providerSessions: {
          ...current.providerSessions,
          ...sessions,
        },
      })),
  };
});
