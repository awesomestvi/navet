import { integrationSessionRuntime } from '@navet/app/auth/integration-session-runtime';
import { mapNavetEntitiesToDeviceCollection } from '@navet/app/core/navet-device-collections';
import {
  mapProviderEntityToNavetDevice,
  mapProviderRoomToNavetRoom,
} from '@navet/app/internal/compat-entity';
import type { ProviderHealth } from '@navet/app/platform/types';
import { getRegisteredProviderContract } from '@navet/app/provider-contract-registry';
import type {
  NavetDevice,
  NavetProviderRuntimeState,
  NavetProviderSession,
  NavetRoom,
  NavetRoomDescriptor,
} from '@navet/app/provider-models';
import { homeyService } from '@navet/app/services/homey.service';
import type { DeviceCollection } from '@navet/app/types/device.types';
import type { IntegrationUser } from '@navet/app/types/integration-user';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { INTEGRATION_PROVIDER_IDS, INTEGRATION_PROVIDERS } from '@navet/app/types/provider';
import { createProviderScopedId } from '@navet/app/utils/provider-ids';
import { areDataEqual } from '@navet/app/utils/structural-equality';
import type { NavetEntity, NavetEntityEvent, NavetProviderState } from '@navet/core/types';
import { openhabService } from '@navet/provider-openhab/openhab-service';
import {
  createDashboardEntityView,
  type DashboardEntityView,
} from '@navet/ui/dashboard-entity-view';
import { createStore } from 'zustand/vanilla';
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
  providerEntitiesByProviderId: Partial<Record<IntegrationProviderId, Record<string, NavetEntity>>>;
  providerEntityLookupByProviderId: Partial<Record<IntegrationProviderId, Record<string, string>>>;
  providerEntitiesByCanonicalId: Record<string, NavetEntity>;
  providerEntityViewsByProviderId: Partial<
    Record<IntegrationProviderId, Record<string, DashboardEntityView>>
  >;
  providerEntityViewsByCanonicalId: Record<string, DashboardEntityView>;
  providerEvents: NavetEntityEvent[];
  providerDeviceCollectionsByProviderId: Partial<Record<IntegrationProviderId, DeviceCollection>>;
  providerRoomsByProviderId: Partial<Record<IntegrationProviderId, Record<string, NavetRoom>>>;
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

function getSafeOpenHABSnapshot() {
  if (typeof openhabService.getSnapshot === 'function') {
    return openhabService.getSnapshot();
  }

  return {
    connected: false,
    items: {},
    error: null,
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

function resolveInitialSelectedProviderIds(
  sessions: Partial<Record<IntegrationProviderId, NavetProviderSession>>
): IntegrationProviderId[] {
  const providerOrder = INTEGRATION_PROVIDER_IDS.filter((providerId) => sessions[providerId]);
  return providerOrder.length > 0 ? providerOrder : ['home_assistant', 'homey'];
}

type ProviderScopedState = {
  deviceCollection: DeviceCollection;
  devicesByCanonicalId: Record<string, NavetDevice>;
  entityLookupByCanonicalId: Record<string, string>;
  entityViewsByCanonicalId: Record<string, DashboardEntityView>;
  entitiesByCanonicalId: Record<string, NavetEntity>;
  roomsByCanonicalId: Record<string, NavetRoom>;
};

function addLookupAlias(
  index: Record<string, string>,
  alias: string | undefined,
  canonicalId: string
) {
  if (!alias) {
    return;
  }

  index[alias] = canonicalId;
}

function buildEntityLookupIndex(
  providerId: IntegrationProviderId,
  entitiesByCanonicalId: Record<string, NavetEntity>
) {
  const lookupByCanonicalId: Record<string, string> = {};

  for (const entity of Object.values(entitiesByCanonicalId)) {
    addLookupAlias(lookupByCanonicalId, entity.canonicalId, entity.canonicalId);
    addLookupAlias(lookupByCanonicalId, entity.id, entity.canonicalId);
    addLookupAlias(lookupByCanonicalId, entity.externalId, entity.canonicalId);
    addLookupAlias(
      lookupByCanonicalId,
      entity.externalId ? createProviderScopedId(providerId, entity.externalId) : undefined,
      entity.canonicalId
    );
  }

  return lookupByCanonicalId;
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

function reuseValue<T>(previousValue: T | undefined, nextValue: T): T {
  return previousValue !== undefined && areDataEqual(previousValue, nextValue)
    ? previousValue
    : nextValue;
}

function buildProviderScopedState(
  providerId: IntegrationProviderId,
  _homeAssistantState: HomeAssistantStore,
  previousState?: ProviderScopedState
): ProviderScopedState {
  const providerState = getProviderState(providerId);
  const entitiesByCanonicalId: Record<string, NavetEntity> = {};
  const entityViewsByCanonicalId: Record<string, DashboardEntityView> = {};
  const devicesByCanonicalId: Record<string, NavetDevice> = {};
  const roomsByCanonicalId: Record<string, NavetRoom> = {};

  for (const entity of providerState?.entities ?? []) {
    const previousEntity = previousState?.entitiesByCanonicalId[entity.canonicalId];
    const nextEntity = reuseValue(previousEntity, entity);
    entitiesByCanonicalId[nextEntity.canonicalId] = nextEntity;

    const previousView = previousState?.entityViewsByCanonicalId[nextEntity.canonicalId];
    entityViewsByCanonicalId[nextEntity.canonicalId] =
      previousView && previousEntity === nextEntity
        ? previousView
        : createDashboardEntityView(nextEntity);

    const previousDevice = previousState?.devicesByCanonicalId[nextEntity.canonicalId];
    devicesByCanonicalId[nextEntity.canonicalId] =
      previousDevice && previousEntity === nextEntity
        ? previousDevice
        : mapProviderEntityToNavetDevice(nextEntity);
  }

  for (const room of providerState?.rooms ?? []) {
    const mappedRoom = mapProviderRoomToNavetRoom(room);
    roomsByCanonicalId[mappedRoom.canonicalId] = reuseValue(
      previousState?.roomsByCanonicalId[mappedRoom.canonicalId],
      mappedRoom
    );
  }

  const nextDeviceCollection = mapNavetEntitiesToDeviceCollection(
    Object.values(entitiesByCanonicalId)
  );
  const deviceCollection = reuseValue(previousState?.deviceCollection, nextDeviceCollection);
  const entityLookupByCanonicalId = reuseValue(
    previousState?.entityLookupByCanonicalId,
    buildEntityLookupIndex(providerId, entitiesByCanonicalId)
  );
  return {
    deviceCollection,
    devicesByCanonicalId,
    entityLookupByCanonicalId,
    entityViewsByCanonicalId,
    entitiesByCanonicalId,
    roomsByCanonicalId,
  };
}

function flattenProviderRecords<T>(
  recordByProviderId: Partial<Record<IntegrationProviderId, Record<string, T>>>
): Record<string, T> {
  return Object.values(recordByProviderId).reduce<Record<string, T>>((merged, record) => {
    if (!record) {
      return merged;
    }

    Object.assign(merged, record);
    return merged;
  }, {});
}

function replaceFlattenedProviderRecord<T>(
  previousFlatRecord: Record<string, T>,
  previousProviderRecord: Record<string, T>,
  nextProviderRecord: Record<string, T>
): Record<string, T> {
  if (previousProviderRecord === nextProviderRecord) {
    return previousFlatRecord;
  }

  const nextFlatRecord = { ...previousFlatRecord };

  for (const key of Object.keys(previousProviderRecord)) {
    delete nextFlatRecord[key];
  }

  Object.assign(nextFlatRecord, nextProviderRecord);
  return nextFlatRecord;
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

    if (!areDataEqual(previousEntity, entity)) {
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
): NavetProviderRuntimeState {
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

function buildRoomDescriptors(
  homeAssistantState: HomeAssistantStore,
  roomsByCanonicalId: Record<string, NavetRoom>
): NavetRoomDescriptor[] {
  const descriptorMap = new Map<string, NavetRoomDescriptor>();
  const homeySnapshot = getSafeHomeySnapshot();

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

  const buildInitialProviderScopedState = (homeAssistantState: HomeAssistantStore) => {
    const providerStateByProviderId = Object.fromEntries(
      INTEGRATION_PROVIDER_IDS.map((providerId) => [
        providerId,
        buildProviderScopedState(providerId, homeAssistantState),
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
      providerRoomsByProviderId: Object.fromEntries(
        INTEGRATION_PROVIDER_IDS.map((providerId) => [
          providerId,
          providerStateByProviderId[providerId].roomsByCanonicalId,
        ])
      ) as Record<IntegrationProviderId, Record<string, NavetRoom>>,
    };
  };

  const syncProviderState = (
    current: IntegrationStore,
    providerId: IntegrationProviderId,
    nextProviderScopedState: ProviderScopedState,
    homeAssistantState: HomeAssistantStore,
    nextProviderRuntime: NavetProviderRuntimeState,
    nextProviderHealth: ProviderHealth,
    extraState: Partial<IntegrationStore> = {}
  ): IntegrationStore => {
    const previousEntities = current.providerEntitiesByProviderId[providerId] ?? {};
    const previousViews = current.providerEntityViewsByProviderId[providerId] ?? {};
    const previousLookup = current.providerEntityLookupByProviderId[providerId] ?? {};
    const previousCollections = current.providerDeviceCollectionsByProviderId[providerId];
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
    const nextRoomDescriptors = buildRoomDescriptors(homeAssistantState, roomsByCanonicalId);
    const roomDescriptors = reuseValue(current.roomDescriptors, nextRoomDescriptors);
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

    return {
      ...current,
      ...extraState,
      providerDeviceCollectionsByProviderId,
      providerEntityLookupByProviderId,
      providerEntitiesByProviderId,
      providerEntityViewsByProviderId,
      providerRoomsByProviderId,
      providerEntitiesByCanonicalId,
      providerEntityViewsByCanonicalId,
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
    set((current) => {
      const nextHomeAssistantState = buildProviderScopedState(
        'home_assistant',
        state,
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
        }
      );
    });
  };

  const syncHomeyState = () => {
    const snapshot = getSafeHomeySnapshot();
    const homeAssistantState = homeAssistantStore.getState();
    set((current) => {
      const nextHomeyState = buildProviderScopedState(
        'homey',
        homeAssistantState,
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
        }
      );
    });
  };

  const syncOpenHABState = () => {
    const homeAssistantState = homeAssistantStore.getState();

    set((current) => {
      const nextOpenHABState = buildProviderScopedState(
        'openhab',
        homeAssistantState,
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
  const initialCanonicalState = buildInitialProviderScopedState(currentHomeAssistantState);
  const initialProviderRuntime = buildProviderRuntime(currentHomeAssistantState);
  const initialProviderEntitiesByCanonicalId = flattenProviderRecords(
    initialCanonicalState.providerEntitiesByProviderId
  );
  const initialProviderEntityViewsByCanonicalId = flattenProviderRecords(
    initialCanonicalState.providerEntityViewsByProviderId
  );
  const initialRoomsByCanonicalId = flattenProviderRecords(
    initialCanonicalState.providerRoomsByProviderId
  );
  const initialRoomDescriptors = buildRoomDescriptors(
    currentHomeAssistantState,
    initialRoomsByCanonicalId
  );
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
  if (typeof openhabService.subscribe === 'function') {
    openhabService.subscribe(syncOpenHABState);
  }

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
    providerRoomsByProviderId: initialCanonicalState.providerRoomsByProviderId,
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
  };
});
