import {
  mapProviderEntityToNavetDevice,
  mapProviderRoomToNavetRoom,
  mapProviderStateToCompatibilitySnapshot,
} from '@navet/app/internal/compat-entity';
import type {
  NavetDevice,
  NavetProviderRuntimeState,
  NavetProviderSnapshot,
  NavetRoom,
  NavetRoomDescriptor,
} from '@navet/app/internal/compat-models';
import {
  buildHomeAssistantCompatibilitySnapshot,
  buildHomeyCompatibilitySnapshot,
} from '@navet/app/internal/compat-snapshot-builders';
import { getRegisteredProviderContract } from '@navet/app/provider-contract-registry';
import type { NavetEntity, NavetEntityEvent, NavetProviderState } from '@navet/core/types';
import {
  createDashboardEntityView,
  type DashboardEntityView,
} from '@navet/ui/dashboard-entity-view';
import { createStore } from 'zustand/vanilla';
import type { NavetProviderSession } from '@/app/internal/compat';
import type { ProviderHealth } from '@/app/platform/types';
import { homeyService } from '@/app/services/homey.service';
import type { IntegrationUser } from '@/app/types/integration-user';
import type { IntegrationProviderId } from '@/app/types/provider';
import { INTEGRATION_PROVIDER_IDS, INTEGRATION_PROVIDERS } from '@/app/types/provider';
import { integrationSessionRuntime } from '@/auth/integration-session-runtime';
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
  providerEntitiesByCanonicalId: Record<string, NavetEntity>;
  providerEntityViewsByCanonicalId: Record<string, DashboardEntityView>;
  providerEvents: NavetEntityEvent[];
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
  const snapshot = integrationSessionRuntime.getSnapshot();
  const sessions = snapshot.sessions ?? {};
  const sessionEntries = (Object.keys(sessions) as IntegrationProviderId[])
    .map((providerId): [IntegrationProviderId, NavetProviderSession | null] => [
      providerId,
      getRegisteredProviderContract(providerId).bootstrapSession?.(sessions) ?? null,
    ])
    .filter((entry): entry is [IntegrationProviderId, NavetProviderSession] => entry[1] !== null);

  return Object.fromEntries(sessionEntries) as Partial<
    Record<IntegrationProviderId, NavetProviderSession>
  >;
}

function resolveInitialCurrentProviderId(
  sessions: Partial<Record<IntegrationProviderId, NavetProviderSession>>
): IntegrationProviderId {
  const providerOrder = INTEGRATION_PROVIDER_IDS;
  return providerOrder.find((providerId) => sessions[providerId]) ?? 'home_assistant';
}

function createEmptyProviderSnapshot(providerId: IntegrationProviderId): NavetProviderSnapshot {
  return {
    providerId,
    connected: false,
    devices: [],
    rooms: [],
  };
}

function buildCompatibilityProviderSnapshots(
  homeAssistantState: HomeAssistantStore
): Partial<Record<IntegrationProviderId, NavetProviderSnapshot>> {
  const homeySnapshot = getSafeHomeySnapshot();

  return {
    home_assistant: buildHomeAssistantCompatibilitySnapshot({
      connected: homeAssistantState.connected,
      entities: homeAssistantState.entities,
      areas: homeAssistantState.areas,
      deviceRegistry: homeAssistantState.deviceRegistry,
      entityRegistry: homeAssistantState.entityRegistry,
    }),
    homey: buildHomeyCompatibilitySnapshot(homeySnapshot),
    openhab: createEmptyProviderSnapshot('openhab'),
    hubitat: createEmptyProviderSnapshot('hubitat'),
    smartthings: createEmptyProviderSnapshot('smartthings'),
  };
}

function collectProviderStates(): Partial<Record<IntegrationProviderId, NavetProviderState>> {
  return Object.fromEntries(
    INTEGRATION_PROVIDER_IDS.flatMap((providerId) => {
      try {
        const contract = getRegisteredProviderContract(providerId);
        if (typeof contract.getState === 'function') {
          return [[providerId, contract.getState()] as const];
        }
      } catch {
        // Some startup and unit-test paths still initialize the store before provider registrations.
      }

      return [];
    })
  ) as Partial<Record<IntegrationProviderId, NavetProviderState>>;
}

function collectProviderSnapshots(
  homeAssistantState: HomeAssistantStore
): Partial<Record<IntegrationProviderId, NavetProviderSnapshot>> {
  const compatibilitySnapshots = buildCompatibilityProviderSnapshots(homeAssistantState);
  const providerStates = collectProviderStates();

  return Object.fromEntries(
    INTEGRATION_PROVIDER_IDS.map((providerId) => {
      return [
        providerId,
        providerStates[providerId]
          ? mapProviderStateToCompatibilitySnapshot(providerStates[providerId])
          : (compatibilitySnapshots[providerId] ?? createEmptyProviderSnapshot(providerId)),
      ];
    })
  ) as Partial<Record<IntegrationProviderId, NavetProviderSnapshot>>;
}

function indexProviderState(
  providerStates: Partial<Record<IntegrationProviderId, NavetProviderState>>,
  providerSnapshots: Partial<Record<IntegrationProviderId, NavetProviderSnapshot>>
): {
  providerEntitiesByCanonicalId: Record<string, NavetEntity>;
  providerEntityViewsByCanonicalId: Record<string, DashboardEntityView>;
  devicesByCanonicalId: Record<string, NavetDevice>;
  roomsByCanonicalId: Record<string, NavetRoom>;
} {
  const providerEntitiesByCanonicalId: Record<string, NavetEntity> = {};
  const providerEntityViewsByCanonicalId: Record<string, DashboardEntityView> = {};
  const devicesByCanonicalId: Record<string, NavetDevice> = {};
  const roomsByCanonicalId: Record<string, NavetRoom> = {};

  for (const providerState of Object.values(providerStates)) {
    if (!providerState) {
      continue;
    }

    for (const entity of providerState.entities) {
      providerEntitiesByCanonicalId[entity.canonicalId] = entity;
      providerEntityViewsByCanonicalId[entity.canonicalId] = createDashboardEntityView(entity);
      devicesByCanonicalId[entity.canonicalId] = mapProviderEntityToNavetDevice(entity);
    }

    for (const room of providerState.rooms) {
      roomsByCanonicalId[room.canonicalId] = mapProviderRoomToNavetRoom(room);
    }
  }

  for (const providerSnapshot of Object.values(providerSnapshots)) {
    if (!providerSnapshot) {
      continue;
    }

    for (const device of providerSnapshot.devices) {
      if (!(device.canonicalId in devicesByCanonicalId)) {
        devicesByCanonicalId[device.canonicalId] = device;
      }
    }

    for (const room of providerSnapshot.rooms) {
      if (!(room.canonicalId in roomsByCanonicalId)) {
        roomsByCanonicalId[room.canonicalId] = room;
      }
    }
  }

  return {
    providerEntitiesByCanonicalId,
    providerEntityViewsByCanonicalId,
    devicesByCanonicalId,
    roomsByCanonicalId,
  };
}

function buildProviderSnapshots(homeAssistantState: HomeAssistantStore): {
  providerStates: Partial<Record<IntegrationProviderId, NavetProviderState>>;
  providerSnapshots: Partial<Record<IntegrationProviderId, NavetProviderSnapshot>>;
  providerEntitiesByCanonicalId: Record<string, NavetEntity>;
  providerEntityViewsByCanonicalId: Record<string, DashboardEntityView>;
  devicesByCanonicalId: Record<string, NavetDevice>;
  roomsByCanonicalId: Record<string, NavetRoom>;
} {
  const providerStates = collectProviderStates();
  const providerSnapshots = collectProviderSnapshots(homeAssistantState);
  const {
    providerEntitiesByCanonicalId,
    providerEntityViewsByCanonicalId,
    devicesByCanonicalId,
    roomsByCanonicalId,
  } = indexProviderState(providerStates, providerSnapshots);

  return {
    providerStates,
    providerSnapshots,
    providerEntitiesByCanonicalId,
    providerEntityViewsByCanonicalId,
    devicesByCanonicalId,
    roomsByCanonicalId,
  };
}

function filterProviderEntities(
  entitiesByCanonicalId: Record<string, NavetEntity>,
  providerId: IntegrationProviderId
): Record<string, NavetEntity> {
  return Object.fromEntries(
    Object.entries(entitiesByCanonicalId).filter(([, entity]) => entity.providerId === providerId)
  );
}

function collectProviderEntityEvents(
  providerId: IntegrationProviderId,
  previousEntitiesByCanonicalId: Record<string, NavetEntity>,
  nextEntitiesByCanonicalId: Record<string, NavetEntity>
): NavetEntityEvent[] {
  const events: NavetEntityEvent[] = [];
  const timestamp = new Date().toISOString();

  for (const [entityId, entity] of Object.entries(nextEntitiesByCanonicalId)) {
    const previousEntity = previousEntitiesByCanonicalId[entityId];

    if (!previousEntity) {
      events.push({
        type: 'entity_added',
        providerId,
        entityId,
        entity,
        at: timestamp,
      });
      continue;
    }

    if (JSON.stringify(previousEntity) !== JSON.stringify(entity)) {
      events.push({
        type: 'entity_updated',
        providerId,
        entityId,
        entity,
        at: timestamp,
      });
    }
  }

  for (const entityId of Object.keys(previousEntitiesByCanonicalId)) {
    if (!(entityId in nextEntitiesByCanonicalId)) {
      events.push({
        type: 'entity_removed',
        providerId,
        entityId,
        at: timestamp,
      });
    }
  }

  return events;
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
    hubitat: createProviderRuntimeState('hubitat', {
      connected: false,
      connecting: false,
      reconnecting: false,
      entitiesHydrated: false,
      registriesHydrated: false,
    }),
    smartthings: createProviderRuntimeState('smartthings', {
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
  const { roomsByCanonicalId } = indexProviderState(
    collectProviderStates(),
    collectProviderSnapshots(homeAssistantState)
  );

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
        implementationStatus: getImplementationStatus(provider.id),
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
  const implementedProviderIds = new Set<IntegrationProviderId>([
    'home_assistant',
    'homey',
    'openhab',
  ]);
  return implementedProviderIds.has(providerId) ? 'implemented' : 'planned';
}

export const integrationStore = createStore<IntegrationStore>()((set) => {
  const syncHomeAssistantState = (state: HomeAssistantStore) => {
    const {
      providerSnapshots,
      providerEntitiesByCanonicalId,
      providerEntityViewsByCanonicalId,
      devicesByCanonicalId,
      roomsByCanonicalId,
    } = buildProviderSnapshots(state);
    const providerRuntime = buildProviderRuntime(state);
    const roomDescriptors = buildRoomDescriptors(state);

    set((current) => {
      const providerEvents = collectProviderEntityEvents(
        'home_assistant',
        filterProviderEntities(current.providerEntitiesByCanonicalId, 'home_assistant'),
        filterProviderEntities(providerEntitiesByCanonicalId, 'home_assistant')
      );

      return {
        ...current,
        currentUser: current.currentUser ?? state.user,
        providerSnapshots,
        providerEntitiesByCanonicalId,
        providerEntityViewsByCanonicalId,
        providerEvents: [...current.providerEvents, ...providerEvents].slice(-100),
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
      };
    });
  };

  const syncHomeyState = () => {
    const snapshot = getSafeHomeySnapshot();
    const homeAssistantState = homeAssistantStore.getState();
    const {
      providerSnapshots,
      providerEntitiesByCanonicalId,
      providerEntityViewsByCanonicalId,
      devicesByCanonicalId,
      roomsByCanonicalId,
    } = buildProviderSnapshots(homeAssistantState);
    const providerRuntime = buildProviderRuntime(homeAssistantState);
    const roomDescriptors = buildRoomDescriptors(homeAssistantState);

    set((current) => {
      const providerEvents = collectProviderEntityEvents(
        'homey',
        filterProviderEntities(current.providerEntitiesByCanonicalId, 'homey'),
        filterProviderEntities(providerEntitiesByCanonicalId, 'homey')
      );

      return {
        ...current,
        homey: {
          connected: snapshot.connected,
        },
        providerSnapshots,
        providerEntitiesByCanonicalId,
        providerEntityViewsByCanonicalId,
        providerEvents: [...current.providerEvents, ...providerEvents].slice(-100),
        providerRuntime,
        devicesByCanonicalId,
        roomsByCanonicalId,
        roomDescriptors,
        providerHealth: {
          ...current.providerHealth,
          homey: createProviderHealthFromHomey(getImplementationStatus('homey')),
        },
      };
    });
  };

  const currentHomeAssistantState = homeAssistantStore.getState();
  const initialCanonicalState = buildProviderSnapshots(currentHomeAssistantState);
  const initialProviderRuntime = buildProviderRuntime(currentHomeAssistantState);
  const initialRoomDescriptors = buildRoomDescriptors(currentHomeAssistantState);
  const initialProviderSessions = getProviderSessionsSnapshot();
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
    currentProviderId: resolveInitialCurrentProviderId(initialProviderSessions),
    selectedProviderIds: ['home_assistant', 'homey'],
    providerSessions: initialProviderSessions,
    providerSnapshots: initialCanonicalState.providerSnapshots,
    providerEntitiesByCanonicalId: initialCanonicalState.providerEntitiesByCanonicalId,
    providerEntityViewsByCanonicalId: initialCanonicalState.providerEntityViewsByCanonicalId,
    providerEvents: [],
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
