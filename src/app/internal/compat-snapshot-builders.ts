import {
  mapProviderEntityToNavetDevice,
  mapProviderRoomToNavetRoom,
} from '@navet/app/internal/compat-entity';
import type { NavetProviderSnapshot } from '@navet/app/internal/compat-models';
import {
  buildHomeAssistantProviderRooms,
  mapHomeAssistantEntitiesToNavetEntities,
} from '@navet/provider-homeassistant/homeassistant-mappers';
import {
  buildHomeyProviderRooms,
  mapHomeySnapshotToNavetEntities,
} from '@navet/provider-homey/homey-mappers';
import {
  buildOpenHABProviderRooms,
  mapOpenHABSnapshotToNavetEntities,
} from '@navet/provider-openhab/openhab-mappers';

interface HomeAssistantSnapshotInput {
  connected: boolean;
  entities: Parameters<typeof mapHomeAssistantEntitiesToNavetEntities>[0]['entities'];
  areas: Parameters<typeof mapHomeAssistantEntitiesToNavetEntities>[0]['areas'];
  deviceRegistry: Parameters<typeof mapHomeAssistantEntitiesToNavetEntities>[0]['deviceRegistry'];
  entityRegistry: Parameters<typeof mapHomeAssistantEntitiesToNavetEntities>[0]['entityRegistry'];
}

export function buildHomeAssistantCompatibilitySnapshot(
  input: HomeAssistantSnapshotInput
): NavetProviderSnapshot {
  return {
    providerId: 'home_assistant',
    connected: input.connected,
    devices: mapHomeAssistantEntitiesToNavetEntities({
      entities: input.entities,
      areas: input.areas,
      deviceRegistry: input.deviceRegistry,
      entityRegistry: input.entityRegistry,
    }).map(mapProviderEntityToNavetDevice),
    rooms: buildHomeAssistantProviderRooms({
      entities: input.entities,
      areas: input.areas,
      deviceRegistry: input.deviceRegistry,
      entityRegistry: input.entityRegistry,
    }).map(mapProviderRoomToNavetRoom),
  };
}

export function buildHomeyCompatibilitySnapshot(
  snapshot: Parameters<typeof mapHomeySnapshotToNavetEntities>[0]
): NavetProviderSnapshot {
  return {
    providerId: 'homey',
    connected: snapshot.connected,
    devices: mapHomeySnapshotToNavetEntities(snapshot).map(mapProviderEntityToNavetDevice),
    rooms: buildHomeyProviderRooms(snapshot).map(mapProviderRoomToNavetRoom),
  };
}

export function buildOpenHABCompatibilitySnapshot(
  snapshot: Parameters<typeof mapOpenHABSnapshotToNavetEntities>[0]
): NavetProviderSnapshot {
  return {
    providerId: 'openhab',
    connected: snapshot.connected,
    devices: mapOpenHABSnapshotToNavetEntities(snapshot).map(mapProviderEntityToNavetDevice),
    rooms: buildOpenHABProviderRooms(snapshot).map(mapProviderRoomToNavetRoom),
  };
}
