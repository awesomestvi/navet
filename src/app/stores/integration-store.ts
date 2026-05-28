import { createStore } from 'zustand/vanilla';
import type {
  NavetDevice,
  NavetProviderRuntimeState,
  NavetProviderSession,
  NavetProviderSnapshot,
  NavetRoom,
  NavetRoomDescriptor,
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
import type { IntegrationUser } from '@/app/types/integration-user';
import type { IntegrationProviderId } from '@/app/types/provider';
import { INTEGRATION_PROVIDERS } from '@/app/types/provider';
import { type HomeAssistantStore, homeAssistantStore } from './home-assistant-store';

export interface HomeyRuntimeSlice {
  connected: boolean;
}

interface IntegrationRuntimeState {
  homey: HomeyRuntimeSlice;
  availableProviderIds: IntegrationProviderId[];
  selectedProviderIds: IntegrationProviderId[];
  providerHealth: Record<IntegrationProviderId, ProviderHealth>;
  providerRuntime: Record<IntegrationProviderId, NavetProviderRuntimeState>;
  providers: IntegrationProviderId[];
  currentProviderId: IntegrationProviderId;
  providerSessions: Partial<Record<IntegrationProviderId, NavetProviderSession>>;
  providerSnapshots: Partial<Record<IntegrationProviderId, NavetProviderSnapshot>>;
  devicesByCanonicalId: Record<string, NavetDevice>;
  roomsByCanonicalId: Record<string, NavetRoom>;
  roomDescriptors: NavetRoomDescriptor[];
  currentUser: IntegrationUser | null;
  setSelectedProviders: (providerIds: IntegrationProviderId[]) => void;
  setIntegrationUser: (user: IntegrationUser | null) => void;
  setCurrentProviderId: (providerId: IntegrationProviderId) => void;
  setProviderSessions: (
    sessions: Partial<Record<IntegrationProviderId, NavetProviderSession>>
  ) => void;
}

export type IntegrationStore = IntegrationRuntimeState;

function getSafeHomeySnapshot() {
  if (typeof homeyService.getSnapshot === 'function') {
    return homeyService.getSnapshot();
  }

  return {
    connected: false,
    devices: {},
    zones: {},
  };
}

function getProviderSessionsSnapshot(): Partial<
  Record<IntegrationProviderId, NavetProviderSession>
> {
  const snapshot = authSessionManager.getSnapshot();
  const sessions = snapshot.sessions ?? {};

  return Object.fromEntries(
    Object.entries(sessions).map(([providerId, session]) => [
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
  const homeySnapshot = getSafeHomeySnapshot();
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
    openhab: {
      providerId: 'openhab',
      connected: false,
      devices: [],
      rooms: [],
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

function normalizeRoomName(name: string) {
  return name.trim().toLocaleLowerCase();
}

function createProviderRuntimeState(
  providerId: IntegrationProviderId,
  options: Omit<NavetProviderRuntimeState, 'providerId'>
): NavetProviderRuntimeState {
  return {
    providerId,
    ...options,
  };
}

function buildProviderRuntime(
  homeAssistantState: HomeAssistantStore
): Record<IntegrationProviderId, NavetProviderRuntimeState> {
  const homeySnapshot = getSafeHomeySnapshot();

  return {
    home_assistant: createProviderRuntimeState('home_assistant', {
      connected: homeAssistantState.connected,
      connecting: homeAssistantState.connecting,
      reconnecting: homeAssistantState.reconnecting,
      entitiesHydrated: homeAssistantState.entities != null,
      registriesHydrated: homeAssistantState.registriesHydrated,
    }),
    homey: createProviderRuntimeState('homey', {
      connected: homeySnapshot.connected,
      connecting: false,
      reconnecting: false,
      entitiesHydrated: Object.keys(homeySnapshot.devices).length > 0,
      registriesHydrated: true,
    }),
    openhab: createProviderRuntimeState('openhab', {
      connected: false,
      connecting: false,
      reconnecting: false,
      entitiesHydrated: false,
      registriesHydrated: false,
    }),
  };
}

function buildRoomDescriptors(homeAssistantState: HomeAssistantStore): NavetRoomDescriptor[] {
  const descriptorMap = new Map<string, NavetRoomDescriptor>();
  const homeySnapshot = getSafeHomeySnapshot();
  const { roomsByCanonicalId } = buildProviderSnapshots(homeAssistantState);

  const upsertRoomDescriptor = (
    name: string,
    source: NavetRoomDescriptor['sources'][number],
    memberIds: string[] = []
  ) => {
    const trimmedName = name.trim();
    if (trimmedName.length === 0) {
      return;
    }

    const normalizedName = normalizeRoomName(trimmedName);
    const existing = descriptorMap.get(normalizedName);

    if (existing) {
      if (!existing.providerIds.includes(source.providerId)) {
        existing.providerIds.push(source.providerId);
      }
      if (
        !existing.sources.some(
          (entry) =>
            entry.providerId === source.providerId &&
            entry.nativeId === source.nativeId &&
            entry.sourceType === source.sourceType
        )
      ) {
        existing.sources.push(source);
      }
      for (const memberId of memberIds) {
        if (!existing.memberIds.includes(memberId)) {
          existing.memberIds.push(memberId);
        }
      }
      return;
    }

    descriptorMap.set(normalizedName, {
      id: normalizedName,
      canonicalId: normalizedName,
      name: trimmedName,
      normalizedName,
      providerIds: [source.providerId],
      memberIds: [...memberIds],
      sources: [source],
    });
  };

  for (const area of homeAssistantState.areas) {
    upsertRoomDescriptor(area.name, {
      providerId: 'home_assistant',
      nativeId: area.area_id,
      sourceType: 'provider_managed',
      supportsOrdering: true,
      supportsDeletion: true,
    });
  }

  for (const zone of Object.values(homeySnapshot.zones)) {
    upsertRoomDescriptor(zone.name, {
      providerId: 'homey',
      nativeId: zone.id,
      sourceType: 'provider_managed',
      supportsOrdering: true,
      supportsDeletion: false,
    });
  }

  for (const room of Object.values(roomsByCanonicalId)) {
    upsertRoomDescriptor(
      room.name,
      {
        providerId: room.providerId,
        nativeId: room.nativeId,
        canonicalId: room.canonicalId,
        sourceType: 'derived',
        supportsOrdering: false,
        supportsDeletion: false,
      },
      room.memberIds
    );
  }

  return Array.from(descriptorMap.values());
}

function getInitialProviderHealth(): Record<IntegrationProviderId, ProviderHealth> {
  return Object.fromEntries(
    Object.values(INTEGRATION_PROVIDERS).map((provider) => [
      provider.id,
      {
        providerId: provider.id,
        connected: false,
        connecting: false,
        reconnecting: false,
        implementationStatus: provider.id === 'openhab' ? 'planned' : 'implemented',
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
  const snapshot = getSafeHomeySnapshot();

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
  return providerId === 'openhab' ? 'planned' : 'implemented';
}

export const integrationStore = createStore<IntegrationStore>()((set) => {
  const syncHomeAssistantState = (state: HomeAssistantStore) => {
    const { providerSnapshots, devicesByCanonicalId, roomsByCanonicalId } =
      buildProviderSnapshots(state);
    const providerRuntime = buildProviderRuntime(state);
    const roomDescriptors = buildRoomDescriptors(state);

    set((current) => ({
      ...current,
      currentUser: current.currentUser ?? state.user,
      providerSnapshots,
      providerRuntime,
      devicesByCanonicalId,
      roomsByCanonicalId,
      roomDescriptors,
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
    const snapshot = getSafeHomeySnapshot();
    const homeAssistantState = homeAssistantStore.getState();
    const { providerSnapshots, devicesByCanonicalId, roomsByCanonicalId } =
      buildProviderSnapshots(homeAssistantState);
    const providerRuntime = buildProviderRuntime(homeAssistantState);
    const roomDescriptors = buildRoomDescriptors(homeAssistantState);

    set((current) => ({
      ...current,
      homey: {
        connected: snapshot.connected,
      },
      providerSnapshots,
      providerRuntime,
      devicesByCanonicalId,
      roomsByCanonicalId,
      roomDescriptors,
      providerHealth: {
        ...current.providerHealth,
        homey: createProviderHealthFromHomey(getImplementationStatus('homey')),
      },
    }));
  };

  const currentHomeAssistantState = homeAssistantStore.getState();
  const initialCanonicalState = buildProviderSnapshots(currentHomeAssistantState);
  const initialProviderRuntime = buildProviderRuntime(currentHomeAssistantState);
  const initialRoomDescriptors = buildRoomDescriptors(currentHomeAssistantState);
  const initialProviderHealth = {
    ...getInitialProviderHealth(),
    home_assistant: createProviderHealthFromHomeAssistant(
      currentHomeAssistantState,
      getImplementationStatus('home_assistant')
    ),
    homey: createProviderHealthFromHomey(getImplementationStatus('homey')),
  };

  homeAssistantStore.subscribe(syncHomeAssistantState);
  if (typeof homeyService.subscribe === 'function') {
    homeyService.subscribe(syncHomeyState);
  }

  return {
    currentUser: currentHomeAssistantState.user,
    homey: {
      connected: getSafeHomeySnapshot().connected,
    },
    availableProviderIds: Object.keys(INTEGRATION_PROVIDERS) as IntegrationProviderId[],
    providers: Object.keys(INTEGRATION_PROVIDERS) as IntegrationProviderId[],
    currentProviderId: authSessionManager.getSnapshot().providerId,
    selectedProviderIds: ['home_assistant', 'homey'],
    providerSessions: getProviderSessionsSnapshot(),
    providerSnapshots: initialCanonicalState.providerSnapshots,
    providerRuntime: initialProviderRuntime,
    devicesByCanonicalId: initialCanonicalState.devicesByCanonicalId,
    roomsByCanonicalId: initialCanonicalState.roomsByCanonicalId,
    roomDescriptors: initialRoomDescriptors,
    providerHealth: initialProviderHealth,
    setSelectedProviders: (providerIds) =>
      set({
        selectedProviderIds: Array.from(new Set(providerIds)),
      }),
    setIntegrationUser: (user) => set({ currentUser: user }),
    setCurrentProviderId: (providerId) => set({ currentProviderId: providerId }),
    setProviderSessions: (sessions) =>
      set((current) => ({
        providerSessions: {
          ...current.providerSessions,
          ...sessions,
        },
      })),
  };
});
