import { mapNavetEntitiesToDeviceCollection } from '@navet/app/core/navet-device-collections';
import { buildManageableRoomReferences } from '@navet/app/platform/provider-room-management';
import type {
  IntegrationProviderRoomModel,
  IntegrationRoomDescriptor,
} from '@navet/app/stores/integration-models';
import type { DeviceCollection } from '@navet/app/types/device.types';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { INTEGRATION_PROVIDER_IDS } from '@navet/app/types/provider';
import { createProviderScopedId } from '@navet/app/utils/provider-ids';
import { areDataEqual } from '@navet/app/utils/structural-equality';
import type { PlatformManageableRoomReference } from '@navet/core/provider-feature-models';
import type {
  NavetEntity,
  NavetEntityEvent,
  NavetProviderRoom,
  NavetProviderState,
} from '@navet/core/types';
import {
  createDashboardEntityView,
  type DashboardEntityView,
} from '@navet/ui/dashboard-entity-view';

export type ProviderScopedState = {
  deviceCollection: DeviceCollection;
  entityLookupByCanonicalId: Record<string, string>;
  entityViewsByCanonicalId: Record<string, DashboardEntityView>;
  entitiesByCanonicalId: Record<string, NavetEntity>;
  normalizedRoomsByCanonicalId: Record<string, NavetProviderRoom>;
  roomsByCanonicalId: Record<string, IntegrationProviderRoomModel>;
};

export interface ProviderStatePipelineHomeAssistantArea {
  area_id: string;
  name: string;
}

export interface ProviderStatePipelineHomeyZone {
  id: string;
  name: string;
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

export function reuseValue<T>(previousValue: T | undefined, nextValue: T): T {
  return previousValue !== undefined && areDataEqual(previousValue, nextValue)
    ? previousValue
    : nextValue;
}

export function buildProviderScopedState({
  providerId,
  providerState,
  previousState,
}: {
  providerId: IntegrationProviderId;
  providerState: NavetProviderState | null;
  previousState?: ProviderScopedState;
}): ProviderScopedState {
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

export function flattenProviderRecords<T>(
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

export function replaceFlattenedProviderRecord<T>(
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

export function collectProviderEntityEvents(
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

export function buildRoomDescriptors({
  homeAssistantAreas,
  homeyZones,
  normalizedRoomsByCanonicalId,
}: {
  homeAssistantAreas: ProviderStatePipelineHomeAssistantArea[];
  homeyZones: Record<string, ProviderStatePipelineHomeyZone>;
  normalizedRoomsByCanonicalId: Record<string, NavetProviderRoom>;
}): IntegrationRoomDescriptor[] {
  const descriptorMap = new Map<string, IntegrationRoomDescriptor>();

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

  for (const area of homeAssistantAreas) {
    upsertRoomDescriptor(area.name, {
      providerId: 'home_assistant',
      nativeId: area.area_id,
      sourceType: 'provider_managed',
      supportsOrdering: true,
      supportsDeletion: true,
    });
  }

  for (const zone of Object.values(homeyZones)) {
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

export function buildManageableRoomsByProviderId(
  roomDescriptors: IntegrationRoomDescriptor[]
): Record<IntegrationProviderId, PlatformManageableRoomReference[]> {
  return Object.fromEntries(
    INTEGRATION_PROVIDER_IDS.map((providerId) => [
      providerId,
      buildManageableRoomReferences(roomDescriptors, providerId),
    ])
  ) as Record<IntegrationProviderId, PlatformManageableRoomReference[]>;
}

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

function normalizeRoomName(name: string) {
  return name.trim().toLocaleLowerCase();
}
