import { integrationSessionRuntime } from '@navet/app/auth/integration-session-runtime';
import type { ProviderHealth } from '@navet/app/platform/types';
import { getRegisteredProviderContract } from '@navet/app/provider-contract-registry';
import { homeyService } from '@navet/app/services/homey.service';
import type {
  IntegrationProviderRoomModel,
  IntegrationProviderRuntimeState,
  IntegrationRoomDescriptor,
} from '@navet/app/stores/integration-models';
import type { DeviceCollection } from '@navet/app/types/device.types';
import type { IntegrationUser } from '@navet/app/types/integration-user';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { INTEGRATION_PROVIDER_IDS, INTEGRATION_PROVIDERS } from '@navet/app/types/provider';
import type { NavetProviderSession } from '@navet/core/provider-contract';
import type { PlatformManageableRoomReference } from '@navet/core/provider-feature-models';
import type {
  NavetEntity,
  NavetEntityEvent,
  NavetProviderRoom,
  NavetProviderState,
} from '@navet/core/types';
import { getOpenHABSnapshot, subscribeOpenHABSnapshot } from '@navet/provider-openhab';
import type { DashboardEntityView } from '@navet/ui/dashboard-entity-view';
import { createStore } from 'zustand/vanilla';
import { type HomeAssistantStore, homeAssistantStore } from './home-assistant-store';
import {
  buildManageableRoomsByProviderId,
  buildProviderScopedState,
  buildRoomDescriptors,
  collectProviderEntityEvents,
  flattenProviderRecords,
  type ProviderScopedState,
  replaceFlattenedProviderRecord,
  reuseValue,
} from './provider-state-pipeline';

export interface HomeyRuntimeSlice {
  connected: boolean;
}

interface IntegrationRuntimeState {
  homey: HomeyRuntimeSlice;
  availableProviderIds: IntegrationProviderId[];
  selectedProviderIds: IntegrationProviderId[];
  providerHealth: Record<IntegrationProviderId, ProviderHealth>;
  providerRuntime: Record<IntegrationProviderId, IntegrationProviderRuntimeState>;
  providers: IntegrationProviderId[];
  currentProviderId: IntegrationProviderId;
  providerSessions: Partial<Record<IntegrationProviderId, NavetProviderSession>>;
  providerEntitiesByProviderId: Partial<Record<IntegrationProviderId, Record<string, NavetEntity>>>;
  providerEntityLookupByProviderId: Partial<Record<IntegrationProviderId, Record<string, string>>>;
  providerEntitiesByCanonicalId: Record<string, NavetEntity>;
  providerEntityViewsByProviderId: Partial<
    Record<IntegrationProviderId, Record<string, DashboardEntityView>>
  >;
  providerEntityViewsByCanonicalId: Record<string, DashboardEntityView>;
  providerEvents: NavetEntityEvent[];
  providerDeviceCollectionsByProviderId: Partial<Record<IntegrationProviderId, DeviceCollection>>;
  providerNormalizedRoomsByProviderId: Partial<
    Record<IntegrationProviderId, Record<string, NavetProviderRoom>>
  >;
  manageableRoomsByProviderId: Partial<
    Record<IntegrationProviderId, PlatformManageableRoomReference[]>
  >;
  providerRoomsByProviderId: Partial<
    Record<IntegrationProviderId, Record<string, IntegrationProviderRoomModel>>
  >;
  normalizedRoomsByCanonicalId: Record<string, NavetProviderRoom>;
  roomsByCanonicalId: Record<string, IntegrationProviderRoomModel>;
  roomDescriptors: IntegrationRoomDescriptor[];
  currentUser: IntegrationUser | null;
  setSelectedProviders: (providerIds: IntegrationProviderId[]) => void;
  setIntegrationUser: (user: IntegrationUser | null) => void;
  setCurrentProviderId: (providerId: IntegrationProviderId) => void;
  setProviderSessions: (
    sessions: Partial<Record<IntegrationProviderId, NavetProviderSession>>
  ) => void;
  applyPreviewProviderState: (
    providerId: IntegrationProviderId,
    options: {
      homeAssistantState: Pick<
        HomeAssistantStore,
        | 'areas'
        | 'config'
        | 'connected'
        | 'connecting'
        | 'connection'
        | 'deviceRegistry'
        | 'entities'
        | 'entityRegistry'
        | 'error'
        | 'reconnecting'
        | 'registriesHydrated'
        | 'user'
      >;
      currentProviderId?: IntegrationProviderId;
      selectedProviderIds?: IntegrationProviderId[];
      currentUser?: IntegrationUser | null;
    }
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

function getSafeOpenHABSnapshot() {
  return getOpenHABSnapshot();
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

function resolveInitialSelectedProviderIds(
  sessions: Partial<Record<IntegrationProviderId, NavetProviderSession>>
): IntegrationProviderId[] {
  const providerOrder = INTEGRATION_PROVIDER_IDS.filter((providerId) => sessions[providerId]);
  return providerOrder.length > 0 ? providerOrder : ['home_assistant', 'homey'];
}

function getProviderState(providerId: IntegrationProviderId): NavetProviderState | null {
  try {
    const contract = getRegisteredProviderContract(providerId);
    return typeof contract.getState === 'function' ? contract.getState() : null;
  } catch {
    // Some startup and unit-test paths still initialize the store before provider registrations.
    return null;
  }
}

function buildCurrentProviderScopedState(
  providerId: IntegrationProviderId,
  previousState?: ProviderScopedState
) {
  return buildProviderScopedState({
    providerId,
    providerState: getProviderState(providerId),
    previousState,
  });
}

function buildCurrentRoomDescriptors(
  homeAssistantState: HomeAssistantStore,
  normalizedRoomsByCanonicalId: Record<string, NavetProviderRoom>
) {
  return buildRoomDescriptors({
    homeAssistantAreas: homeAssistantState.areas,
    homeyZones: getSafeHomeySnapshot().zones,
    normalizedRoomsByCanonicalId,
  });
}

function createProviderRuntimeState(
  providerId: IntegrationProviderId,
  options: Omit<IntegrationProviderRuntimeState, 'providerId'>
): IntegrationProviderRuntimeState {
  return {
    providerId,
    ...options,
  };
}

function buildProviderRuntime(
  homeAssistantState: HomeAssistantStore
): Record<IntegrationProviderId, IntegrationProviderRuntimeState> {
  const homeySnapshot = getSafeHomeySnapshot();
  const openhabSnapshot = getSafeOpenHABSnapshot();

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
      connected: openhabSnapshot.connected,
      connecting: false,
      reconnecting: openhabSnapshot.reconnecting ?? false,
      entitiesHydrated: Object.keys(openhabSnapshot.items).length > 0,
      registriesHydrated: Object.keys(openhabSnapshot.items).length > 0,
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

function buildProviderRuntimeState(
  providerId: IntegrationProviderId,
  homeAssistantState: HomeAssistantStore
): IntegrationProviderRuntimeState {
  switch (providerId) {
    case 'home_assistant':
      return createProviderRuntimeState('home_assistant', {
        connected: homeAssistantState.connected,
        connecting: homeAssistantState.connecting,
        reconnecting: homeAssistantState.reconnecting,
        entitiesHydrated: homeAssistantState.entities != null,
        registriesHydrated: homeAssistantState.registriesHydrated,
      });
    case 'homey': {
      const homeySnapshot = getSafeHomeySnapshot();
      return createProviderRuntimeState('homey', {
        connected: homeySnapshot.connected,
        connecting: false,
        reconnecting: false,
        entitiesHydrated: Object.keys(homeySnapshot.devices).length > 0,
        registriesHydrated: true,
      });
    }
    case 'openhab': {
      const openhabSnapshot = getSafeOpenHABSnapshot();
      return createProviderRuntimeState('openhab', {
        connected: openhabSnapshot.connected,
        connecting: false,
        reconnecting: openhabSnapshot.reconnecting ?? false,
        entitiesHydrated: Object.keys(openhabSnapshot.items).length > 0,
        registriesHydrated: Object.keys(openhabSnapshot.items).length > 0,
      });
    }
    case 'hubitat':
      return createProviderRuntimeState('hubitat', {
        connected: false,
        connecting: false,
        reconnecting: false,
        entitiesHydrated: false,
        registriesHydrated: false,
      });
    case 'smartthings':
      return createProviderRuntimeState('smartthings', {
        connected: false,
        connecting: false,
        reconnecting: false,
        entitiesHydrated: false,
        registriesHydrated: false,
      });
  }
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

function createProviderHealthFromOpenHAB(
  implementationStatus: ProviderHealth['implementationStatus']
): ProviderHealth {
  const snapshot = getSafeOpenHABSnapshot();

  return {
    providerId: 'openhab',
    connected: snapshot.connected,
    connecting: false,
    reconnecting: snapshot.reconnecting ?? false,
    implementationStatus,
    lastError: snapshot.error ?? null,
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
  const providerScopedStateByProviderId = {} as Record<IntegrationProviderId, ProviderScopedState>;

  const buildInitialProviderScopedState = (_homeAssistantState: HomeAssistantStore) => {
    const providerStateByProviderId = Object.fromEntries(
      INTEGRATION_PROVIDER_IDS.map((providerId) => [
        providerId,
        buildCurrentProviderScopedState(providerId),
      ])
    ) as Record<IntegrationProviderId, ProviderScopedState>;

    Object.assign(providerScopedStateByProviderId, providerStateByProviderId);

    return {
      providerDeviceCollectionsByProviderId: Object.fromEntries(
        INTEGRATION_PROVIDER_IDS.map((providerId) => [
          providerId,
          providerStateByProviderId[providerId].deviceCollection,
        ])
      ) as Record<IntegrationProviderId, DeviceCollection>,
      providerEntitiesByProviderId: Object.fromEntries(
        INTEGRATION_PROVIDER_IDS.map((providerId) => [
          providerId,
          providerStateByProviderId[providerId].entitiesByCanonicalId,
        ])
      ) as Record<IntegrationProviderId, Record<string, NavetEntity>>,
      providerEntityLookupByProviderId: Object.fromEntries(
        INTEGRATION_PROVIDER_IDS.map((providerId) => [
          providerId,
          providerStateByProviderId[providerId].entityLookupByCanonicalId,
        ])
      ) as Record<IntegrationProviderId, Record<string, string>>,
      providerEntityViewsByProviderId: Object.fromEntries(
        INTEGRATION_PROVIDER_IDS.map((providerId) => [
          providerId,
          providerStateByProviderId[providerId].entityViewsByCanonicalId,
        ])
      ) as Record<IntegrationProviderId, Record<string, DashboardEntityView>>,
      providerNormalizedRoomsByProviderId: Object.fromEntries(
        INTEGRATION_PROVIDER_IDS.map((providerId) => [
          providerId,
          providerStateByProviderId[providerId].normalizedRoomsByCanonicalId,
        ])
      ) as Record<IntegrationProviderId, Record<string, NavetProviderRoom>>,
      providerRoomsByProviderId: Object.fromEntries(
        INTEGRATION_PROVIDER_IDS.map((providerId) => [
          providerId,
          providerStateByProviderId[providerId].roomsByCanonicalId,
        ])
      ) as Record<IntegrationProviderId, Record<string, IntegrationProviderRoomModel>>,
    };
  };

  const syncProviderState = (
    current: IntegrationStore,
    providerId: IntegrationProviderId,
    nextProviderScopedState: ProviderScopedState,
    homeAssistantState: HomeAssistantStore,
    nextProviderRuntime: IntegrationProviderRuntimeState,
    nextProviderHealth: ProviderHealth,
    extraState: Partial<IntegrationStore> = {},
    options: {
      shouldRebuildRoomDescriptors?: boolean;
    } = {}
  ): IntegrationStore => {
    const previousEntities = current.providerEntitiesByProviderId[providerId] ?? {};
    const previousViews = current.providerEntityViewsByProviderId[providerId] ?? {};
    const previousLookup = current.providerEntityLookupByProviderId[providerId] ?? {};
    const previousCollections = current.providerDeviceCollectionsByProviderId[providerId];
    const previousNormalizedRooms = current.providerNormalizedRoomsByProviderId[providerId] ?? {};
    const previousRooms = current.providerRoomsByProviderId[providerId] ?? {};

    providerScopedStateByProviderId[providerId] = nextProviderScopedState;

    const providerEntitiesByProviderId =
      previousEntities === nextProviderScopedState.entitiesByCanonicalId
        ? current.providerEntitiesByProviderId
        : {
            ...current.providerEntitiesByProviderId,
            [providerId]: nextProviderScopedState.entitiesByCanonicalId,
          };
    const providerEntityViewsByProviderId =
      previousViews === nextProviderScopedState.entityViewsByCanonicalId
        ? current.providerEntityViewsByProviderId
        : {
            ...current.providerEntityViewsByProviderId,
            [providerId]: nextProviderScopedState.entityViewsByCanonicalId,
          };
    const providerEntityLookupByProviderId =
      previousLookup === nextProviderScopedState.entityLookupByCanonicalId
        ? current.providerEntityLookupByProviderId
        : {
            ...current.providerEntityLookupByProviderId,
            [providerId]: nextProviderScopedState.entityLookupByCanonicalId,
          };
    const providerDeviceCollectionsByProviderId =
      previousCollections === nextProviderScopedState.deviceCollection
        ? current.providerDeviceCollectionsByProviderId
        : {
            ...current.providerDeviceCollectionsByProviderId,
            [providerId]: nextProviderScopedState.deviceCollection,
          };
    const providerNormalizedRoomsByProviderId =
      previousNormalizedRooms === nextProviderScopedState.normalizedRoomsByCanonicalId
        ? current.providerNormalizedRoomsByProviderId
        : {
            ...current.providerNormalizedRoomsByProviderId,
            [providerId]: nextProviderScopedState.normalizedRoomsByCanonicalId,
          };
    const providerRoomsByProviderId =
      previousRooms === nextProviderScopedState.roomsByCanonicalId
        ? current.providerRoomsByProviderId
        : {
            ...current.providerRoomsByProviderId,
            [providerId]: nextProviderScopedState.roomsByCanonicalId,
          };

    const providerEntitiesByCanonicalId = replaceFlattenedProviderRecord(
      current.providerEntitiesByCanonicalId,
      previousEntities,
      nextProviderScopedState.entitiesByCanonicalId
    );
    const providerEntityViewsByCanonicalId = replaceFlattenedProviderRecord(
      current.providerEntityViewsByCanonicalId,
      previousViews,
      nextProviderScopedState.entityViewsByCanonicalId
    );
    const normalizedRoomsByCanonicalId = replaceFlattenedProviderRecord(
      current.normalizedRoomsByCanonicalId,
      previousNormalizedRooms,
      nextProviderScopedState.normalizedRoomsByCanonicalId
    );
    const roomsByCanonicalId = replaceFlattenedProviderRecord(
      current.roomsByCanonicalId,
      previousRooms,
      nextProviderScopedState.roomsByCanonicalId
    );
    const providerEvents = collectProviderEntityEvents(
      providerId,
      previousEntities,
      nextProviderScopedState.entitiesByCanonicalId
    );
    const shouldRebuildRoomDescriptors =
      options.shouldRebuildRoomDescriptors === true ||
      previousNormalizedRooms !== nextProviderScopedState.normalizedRoomsByCanonicalId;
    const roomDescriptors = shouldRebuildRoomDescriptors
      ? reuseValue(
          current.roomDescriptors,
          buildCurrentRoomDescriptors(homeAssistantState, normalizedRoomsByCanonicalId)
        )
      : current.roomDescriptors;
    const manageableRoomsByProviderId =
      roomDescriptors === current.roomDescriptors
        ? current.manageableRoomsByProviderId
        : reuseValue(
            current.manageableRoomsByProviderId,
            buildManageableRoomsByProviderId(roomDescriptors)
          );
    const mergedProviderRuntime = reuseValue(
      current.providerRuntime[providerId],
      nextProviderRuntime
    );
    const providerRuntime =
      mergedProviderRuntime === current.providerRuntime[providerId]
        ? current.providerRuntime
        : {
            ...current.providerRuntime,
            [providerId]: mergedProviderRuntime,
          };
    const mergedProviderHealth = reuseValue(current.providerHealth[providerId], nextProviderHealth);
    const providerHealth =
      mergedProviderHealth === current.providerHealth[providerId]
        ? current.providerHealth
        : {
            ...current.providerHealth,
            [providerId]: mergedProviderHealth,
          };

    const hasExtraStateChanges = Object.entries(extraState).some(
      ([key, value]) => current[key as keyof IntegrationStore] !== value
    );
    const hasProviderChanges =
      providerDeviceCollectionsByProviderId !== current.providerDeviceCollectionsByProviderId ||
      providerNormalizedRoomsByProviderId !== current.providerNormalizedRoomsByProviderId ||
      providerEntityLookupByProviderId !== current.providerEntityLookupByProviderId ||
      providerEntitiesByProviderId !== current.providerEntitiesByProviderId ||
      providerEntityViewsByProviderId !== current.providerEntityViewsByProviderId ||
      providerRoomsByProviderId !== current.providerRoomsByProviderId ||
      providerEntitiesByCanonicalId !== current.providerEntitiesByCanonicalId ||
      providerEntityViewsByCanonicalId !== current.providerEntityViewsByCanonicalId ||
      normalizedRoomsByCanonicalId !== current.normalizedRoomsByCanonicalId ||
      manageableRoomsByProviderId !== current.manageableRoomsByProviderId ||
      providerRuntime !== current.providerRuntime ||
      roomsByCanonicalId !== current.roomsByCanonicalId ||
      roomDescriptors !== current.roomDescriptors ||
      providerHealth !== current.providerHealth ||
      providerEvents.length > 0;

    if (!hasExtraStateChanges && !hasProviderChanges) {
      return current;
    }

    return {
      ...current,
      ...extraState,
      providerDeviceCollectionsByProviderId,
      providerNormalizedRoomsByProviderId,
      providerEntityLookupByProviderId,
      providerEntitiesByProviderId,
      providerEntityViewsByProviderId,
      providerRoomsByProviderId,
      providerEntitiesByCanonicalId,
      providerEntityViewsByCanonicalId,
      normalizedRoomsByCanonicalId,
      manageableRoomsByProviderId,
      providerEvents:
        providerEvents.length > 0
          ? [...current.providerEvents, ...providerEvents].slice(-100)
          : current.providerEvents,
      providerRuntime,
      roomsByCanonicalId,
      roomDescriptors,
      providerHealth,
    };
  };

  const syncHomeAssistantState = (state: HomeAssistantStore) => {
    const shouldRebuildRoomDescriptors = state.areas !== previousHomeAssistantAreas;
    previousHomeAssistantAreas = state.areas;
    set((current) => {
      const nextHomeAssistantState = buildCurrentProviderScopedState(
        'home_assistant',
        providerScopedStateByProviderId.home_assistant
      );
      return syncProviderState(
        current,
        'home_assistant',
        nextHomeAssistantState,
        state,
        buildProviderRuntimeState('home_assistant', state),
        createProviderHealthFromHomeAssistant(state, getImplementationStatus('home_assistant')),
        {
          currentUser: current.currentUser ?? state.user,
        },
        { shouldRebuildRoomDescriptors }
      );
    });
  };

  const syncHomeyState = () => {
    const snapshot = getSafeHomeySnapshot();
    const homeAssistantState = homeAssistantStore.getState();
    const shouldRebuildRoomDescriptors = snapshot.zones !== previousHomeyZones;
    previousHomeyZones = snapshot.zones;
    set((current) => {
      const nextHomeyState = buildCurrentProviderScopedState(
        'homey',
        providerScopedStateByProviderId.homey
      );
      return syncProviderState(
        current,
        'homey',
        nextHomeyState,
        homeAssistantState,
        buildProviderRuntimeState('homey', homeAssistantState),
        createProviderHealthFromHomey(getImplementationStatus('homey')),
        {
          homey: {
            connected: snapshot.connected,
          },
        },
        { shouldRebuildRoomDescriptors }
      );
    });
  };

  const syncOpenHABState = () => {
    const homeAssistantState = homeAssistantStore.getState();

    set((current) => {
      const nextOpenHABState = buildCurrentProviderScopedState(
        'openhab',
        providerScopedStateByProviderId.openhab
      );
      return syncProviderState(
        current,
        'openhab',
        nextOpenHABState,
        homeAssistantState,
        buildProviderRuntimeState('openhab', homeAssistantState),
        createProviderHealthFromOpenHAB(getImplementationStatus('openhab'))
      );
    });
  };

  const currentHomeAssistantState = homeAssistantStore.getState();
  let previousHomeAssistantAreas = currentHomeAssistantState.areas;
  let previousHomeyZones = getSafeHomeySnapshot().zones;
  const initialCanonicalState = buildInitialProviderScopedState(currentHomeAssistantState);
  const initialProviderRuntime = buildProviderRuntime(currentHomeAssistantState);
  const initialProviderEntitiesByCanonicalId = flattenProviderRecords(
    initialCanonicalState.providerEntitiesByProviderId
  );
  const initialProviderEntityViewsByCanonicalId = flattenProviderRecords(
    initialCanonicalState.providerEntityViewsByProviderId
  );
  const initialNormalizedRoomsByCanonicalId = flattenProviderRecords(
    initialCanonicalState.providerNormalizedRoomsByProviderId
  );
  const initialRoomsByCanonicalId = flattenProviderRecords(
    initialCanonicalState.providerRoomsByProviderId
  );
  const initialRoomDescriptors = buildCurrentRoomDescriptors(
    currentHomeAssistantState,
    initialNormalizedRoomsByCanonicalId
  );
  const initialManageableRoomsByProviderId =
    buildManageableRoomsByProviderId(initialRoomDescriptors);
  const initialProviderSessions = getProviderSessionsSnapshot();
  const initialProviderHealth = {
    ...getInitialProviderHealth(),
    home_assistant: createProviderHealthFromHomeAssistant(
      currentHomeAssistantState,
      getImplementationStatus('home_assistant')
    ),
    homey: createProviderHealthFromHomey(getImplementationStatus('homey')),
    openhab: createProviderHealthFromOpenHAB(getImplementationStatus('openhab')),
  };

  homeAssistantStore.subscribe(syncHomeAssistantState);
  if (typeof homeyService.subscribe === 'function') {
    homeyService.subscribe(syncHomeyState);
  }
  subscribeOpenHABSnapshot(syncOpenHABState);

  return {
    currentUser: currentHomeAssistantState.user,
    homey: {
      connected: getSafeHomeySnapshot().connected,
    },
    availableProviderIds: Object.keys(INTEGRATION_PROVIDERS) as IntegrationProviderId[],
    providers: Object.keys(INTEGRATION_PROVIDERS) as IntegrationProviderId[],
    currentProviderId: resolveInitialCurrentProviderId(initialProviderSessions),
    selectedProviderIds: resolveInitialSelectedProviderIds(initialProviderSessions),
    providerSessions: initialProviderSessions,
    providerEntitiesByProviderId: initialCanonicalState.providerEntitiesByProviderId,
    providerEntityLookupByProviderId: initialCanonicalState.providerEntityLookupByProviderId,
    providerEntitiesByCanonicalId: initialProviderEntitiesByCanonicalId,
    providerEntityViewsByProviderId: initialCanonicalState.providerEntityViewsByProviderId,
    providerEntityViewsByCanonicalId: initialProviderEntityViewsByCanonicalId,
    providerEvents: [],
    providerRuntime: initialProviderRuntime,
    providerDeviceCollectionsByProviderId:
      initialCanonicalState.providerDeviceCollectionsByProviderId,
    providerNormalizedRoomsByProviderId: initialCanonicalState.providerNormalizedRoomsByProviderId,
    manageableRoomsByProviderId: initialManageableRoomsByProviderId,
    providerRoomsByProviderId: initialCanonicalState.providerRoomsByProviderId,
    normalizedRoomsByCanonicalId: initialNormalizedRoomsByCanonicalId,
    roomsByCanonicalId: initialRoomsByCanonicalId,
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
    applyPreviewProviderState: (providerId, options) => {
      const previewHomeAssistantState = options.homeAssistantState as HomeAssistantStore;
      const nextProviderScopedState = buildCurrentProviderScopedState(
        providerId,
        providerScopedStateByProviderId[providerId]
      );
      const providerRuntime = createProviderRuntimeState(providerId, {
        connected: options.homeAssistantState.connected,
        connecting: options.homeAssistantState.connecting,
        reconnecting: options.homeAssistantState.reconnecting,
        entitiesHydrated: options.homeAssistantState.entities != null,
        registriesHydrated: options.homeAssistantState.registriesHydrated,
      });
      const providerHealth: ProviderHealth = {
        providerId,
        connected: options.homeAssistantState.connected,
        connecting: options.homeAssistantState.connecting,
        reconnecting: options.homeAssistantState.reconnecting,
        implementationStatus: 'implemented',
        lastError: options.homeAssistantState.error,
      };

      set((current) =>
        syncProviderState(
          current,
          providerId,
          nextProviderScopedState,
          previewHomeAssistantState,
          providerRuntime,
          providerHealth,
          {
            currentProviderId: options.currentProviderId ?? current.currentProviderId,
            selectedProviderIds: options.selectedProviderIds ?? current.selectedProviderIds,
            currentUser:
              options.currentUser ?? options.homeAssistantState.user ?? current.currentUser,
          },
          { shouldRebuildRoomDescriptors: true }
        )
      );
    },
  };
});
