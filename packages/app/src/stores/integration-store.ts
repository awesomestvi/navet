import { integrationSessionRuntime } from '@navet/app/auth/integration-session-runtime';
import { mapNavetEntitiesToDeviceCollection } from '@navet/app/core/navet-device-collections';
import { buildManageableRoomReferences } from '@navet/app/platform/provider-room-management';
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
import { createProviderScopedId } from '@navet/app/utils/provider-ids';
import { areDataEqual } from '@navet/app/utils/structural-equality';
import type { NavetProviderSession } from '@navet/core/provider-contract';
import type { PlatformManageableRoomReference } from '@navet/core/provider-feature-models';
import type {
  NavetEntity,
  NavetEntityEvent,
  NavetProviderRoom,
  NavetProviderState,
} from '@navet/core/types';
import { getOpenHABSnapshot, subscribeOpenHABSnapshot } from '@navet/provider-openhab';
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

type ProviderScopedState = {
  deviceCollection: DeviceCollection;
  entityLookupByCanonicalId: Record<string, string>;
  entityViewsByCanonicalId: Record<string, DashboardEntityView>;
  entitiesByCanonicalId: Record<string, NavetEntity>;
  normalizedRoomsByCanonicalId: Record<string, NavetProviderRoom>;
  roomsByCanonicalId: Record<string, IntegrationProviderRoomModel>;
};

function mapProviderRoomToIntegrationRoom(room: NavetProviderRoom): IntegrationProviderRoomModel {
  return {
    id: room.canonicalId,
    canonicalId: room.canonicalId,
    providerId: room.providerId,
    nativeId: room.externalId,
    name: room.name,
    normalizedName: room.normalizedName,
    alias: room.alias,
    memberIds: [...room.memberIds],
  };
}

const DEVICE_COLLECTION_KEYS = [
  'lights',
  'fans',
  'hvac',
  'climate',
  'media',
  'weather',
  'switches',
  'helpers',
  'covers',
  'locks',
  'scenes',
  'persons',
  'sensors',
  'vacuums',
  'calendars',
  'cameras',
  'grouped-sensors',
] as const;

type DeviceCollectionKey = (typeof DEVICE_COLLECTION_KEYS)[number];
type DeviceCollectionEntry = DeviceCollection[DeviceCollectionKey][number];

function assignDeviceCollectionEntry<K extends DeviceCollectionKey>(
  collection: DeviceCollection,
  key: K,
  value: DeviceCollection[K]
) {
  collection[key] = value;
}

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

function reuseDeviceArrayEntries<T extends { id: string }>(previous: T[], next: T[]): T[] {
  if (previous === next) {
    return previous;
  }

  if (previous.length === 0) {
    return next;
  }

  const previousById = new Map(previous.map((device) => [device.id, device]));
  let changed = previous.length !== next.length;

  const merged = next.map((device, index) => {
    const previousDevice = previousById.get(device.id);
    if (previousDevice && areDataEqual(previousDevice, device)) {
      if (previous[index] !== previousDevice) {
        changed = true;
      }
      return previousDevice;
    }

    if (previous[index] !== device) {
      changed = true;
    }
    return device;
  });

  return changed ? merged : previous;
}

function reuseDeviceCollection(
  previousCollection: DeviceCollection | undefined,
  nextCollection: DeviceCollection
): DeviceCollection {
  if (!previousCollection) {
    return nextCollection;
  }

  let changed = false;
  const mergedCollection = { ...nextCollection };

  for (const key of DEVICE_COLLECTION_KEYS) {
    const previousDevices = previousCollection[key] as DeviceCollectionEntry[];
    const nextDevices = nextCollection[key] as DeviceCollectionEntry[];
    const mergedDevices = reuseDeviceArrayEntries(previousDevices, nextDevices);

    if (mergedDevices !== previousDevices) {
      changed = true;
    }

    assignDeviceCollectionEntry(
      mergedCollection,
      key,
      mergedDevices as DeviceCollection[typeof key]
    );
  }

  return changed ? mergedCollection : previousCollection;
}

function buildProviderScopedState(
  providerId: IntegrationProviderId,
  _homeAssistantState: HomeAssistantStore,
  previousState?: ProviderScopedState
): ProviderScopedState {
  const providerState = getProviderState(providerId);
  const entitiesByCanonicalId: Record<string, NavetEntity> = {};
  const entityViewsByCanonicalId: Record<string, DashboardEntityView> = {};
  const normalizedRoomsByCanonicalId: Record<string, NavetProviderRoom> = {};
  const roomsByCanonicalId: Record<string, IntegrationProviderRoomModel> = {};
  const previousEntityCount = previousState
    ? Object.keys(previousState.entitiesByCanonicalId).length
    : 0;
  const previousNormalizedRoomCount = previousState
    ? Object.keys(previousState.normalizedRoomsByCanonicalId).length
    : 0;
  const previousRoomCount = previousState
    ? Object.keys(previousState.roomsByCanonicalId).length
    : 0;
  let entitiesChanged = !previousState;
  let entityViewsChanged = !previousState;
  let normalizedRoomsChanged = !previousState;
  let roomsChanged = !previousState;

  for (const entity of providerState?.entities ?? []) {
    const previousEntity = previousState?.entitiesByCanonicalId[entity.canonicalId];
    const nextEntity = reuseValue(previousEntity, entity);
    if (previousEntity !== nextEntity) {
      entitiesChanged = true;
    }
    entitiesByCanonicalId[nextEntity.canonicalId] = nextEntity;

    const previousView = previousState?.entityViewsByCanonicalId[nextEntity.canonicalId];
    const nextView =
      previousView && previousEntity === nextEntity
        ? previousView
        : createDashboardEntityView(nextEntity);
    if (previousView !== nextView) {
      entityViewsChanged = true;
    }
    entityViewsByCanonicalId[nextEntity.canonicalId] = nextView;
  }

  for (const room of providerState?.rooms ?? []) {
    const previousNormalizedRoom = previousState?.normalizedRoomsByCanonicalId[room.canonicalId];
    const nextNormalizedRoom = reuseValue(previousNormalizedRoom, room);
    if (previousNormalizedRoom !== nextNormalizedRoom) {
      normalizedRoomsChanged = true;
    }
    normalizedRoomsByCanonicalId[nextNormalizedRoom.canonicalId] = nextNormalizedRoom;

    const mappedRoom = mapProviderRoomToIntegrationRoom(nextNormalizedRoom);
    const previousRoom = previousState?.roomsByCanonicalId[nextNormalizedRoom.canonicalId];
    const nextRoom =
      previousRoom && previousNormalizedRoom === nextNormalizedRoom
        ? previousRoom
        : reuseValue(previousRoom, mappedRoom);
    if (previousRoom !== nextRoom) {
      roomsChanged = true;
    }
    roomsByCanonicalId[nextNormalizedRoom.canonicalId] = nextRoom;
  }

  if (
    !entitiesChanged &&
    previousState &&
    previousEntityCount === Object.keys(entitiesByCanonicalId).length
  ) {
    return {
      deviceCollection: previousState.deviceCollection,
      entityLookupByCanonicalId: previousState.entityLookupByCanonicalId,
      entityViewsByCanonicalId: previousState.entityViewsByCanonicalId,
      entitiesByCanonicalId: previousState.entitiesByCanonicalId,
      normalizedRoomsByCanonicalId:
        !normalizedRoomsChanged &&
        previousNormalizedRoomCount === Object.keys(normalizedRoomsByCanonicalId).length
          ? previousState.normalizedRoomsByCanonicalId
          : normalizedRoomsByCanonicalId,
      roomsByCanonicalId:
        !roomsChanged && previousRoomCount === Object.keys(roomsByCanonicalId).length
          ? previousState.roomsByCanonicalId
          : roomsByCanonicalId,
    };
  }

  const stableEntitiesByCanonicalId =
    !entitiesChanged &&
    previousState &&
    previousEntityCount === Object.keys(entitiesByCanonicalId).length
      ? previousState.entitiesByCanonicalId
      : entitiesByCanonicalId;
  const stableEntityViewsByCanonicalId =
    !entityViewsChanged &&
    previousState &&
    previousEntityCount === Object.keys(entityViewsByCanonicalId).length
      ? previousState.entityViewsByCanonicalId
      : entityViewsByCanonicalId;
  const stableNormalizedRoomsByCanonicalId =
    !normalizedRoomsChanged &&
    previousState &&
    previousNormalizedRoomCount === Object.keys(normalizedRoomsByCanonicalId).length
      ? previousState.normalizedRoomsByCanonicalId
      : normalizedRoomsByCanonicalId;
  const stableRoomsByCanonicalId =
    !roomsChanged && previousState && previousRoomCount === Object.keys(roomsByCanonicalId).length
      ? previousState.roomsByCanonicalId
      : roomsByCanonicalId;

  const nextDeviceCollection =
    stableEntitiesByCanonicalId === previousState?.entitiesByCanonicalId && previousState
      ? previousState.deviceCollection
      : mapNavetEntitiesToDeviceCollection(Object.values(stableEntitiesByCanonicalId));
  const deviceCollection = reuseDeviceCollection(
    previousState?.deviceCollection,
    nextDeviceCollection
  );
  const entityLookupByCanonicalId =
    stableEntitiesByCanonicalId === previousState?.entitiesByCanonicalId && previousState
      ? previousState.entityLookupByCanonicalId
      : reuseValue(
          previousState?.entityLookupByCanonicalId,
          buildEntityLookupIndex(providerId, stableEntitiesByCanonicalId)
        );
  return {
    deviceCollection,
    entityLookupByCanonicalId,
    entityViewsByCanonicalId: stableEntityViewsByCanonicalId,
    entitiesByCanonicalId: stableEntitiesByCanonicalId,
    normalizedRoomsByCanonicalId: stableNormalizedRoomsByCanonicalId,
    roomsByCanonicalId: stableRoomsByCanonicalId,
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

    if (previousEntity !== entity) {
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

function buildRoomDescriptors(
  homeAssistantState: HomeAssistantStore,
  normalizedRoomsByCanonicalId: Record<string, NavetProviderRoom>
): IntegrationRoomDescriptor[] {
  const descriptorMap = new Map<string, IntegrationRoomDescriptor>();
  const homeySnapshot = getSafeHomeySnapshot();

  const upsertRoomDescriptor = (
    name: string,
    source: IntegrationRoomDescriptor['sources'][number],
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

  for (const room of Object.values(normalizedRoomsByCanonicalId)) {
    upsertRoomDescriptor(
      room.name,
      {
        providerId: room.providerId,
        nativeId: room.externalId,
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

function buildManageableRoomsByProviderId(
  roomDescriptors: IntegrationRoomDescriptor[]
): Record<IntegrationProviderId, PlatformManageableRoomReference[]> {
  return Object.fromEntries(
    INTEGRATION_PROVIDER_IDS.map((providerId) => [
      providerId,
      buildManageableRoomReferences(roomDescriptors, providerId),
    ])
  ) as Record<IntegrationProviderId, PlatformManageableRoomReference[]>;
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
          buildRoomDescriptors(homeAssistantState, normalizedRoomsByCanonicalId)
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
        },
        { shouldRebuildRoomDescriptors }
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
  const initialRoomDescriptors = buildRoomDescriptors(
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
      const nextProviderScopedState = buildProviderScopedState(
        providerId,
        previewHomeAssistantState,
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
