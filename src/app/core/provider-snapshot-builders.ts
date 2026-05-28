import type { NavetProviderSnapshot } from './navet';
import {
  buildHomeAssistantNavetRooms,
  buildHomeyNavetRooms,
  mapHomeAssistantEntitiesToNavetDevices,
  mapHomeySnapshotToNavetDevices,
} from './navet-mappers';

interface HomeAssistantSnapshotInput {
  connected: boolean;
  entities: Parameters<typeof mapHomeAssistantEntitiesToNavetDevices>[0]['entities'];
  areas: Parameters<typeof mapHomeAssistantEntitiesToNavetDevices>[0]['areas'];
  deviceRegistry: Parameters<typeof mapHomeAssistantEntitiesToNavetDevices>[0]['deviceRegistry'];
  entityRegistry: Parameters<typeof mapHomeAssistantEntitiesToNavetDevices>[0]['entityRegistry'];
}

export function buildHomeAssistantProviderSnapshot(
  input: HomeAssistantSnapshotInput
): NavetProviderSnapshot {
  return {
    providerId: 'home_assistant',
    connected: input.connected,
    devices: mapHomeAssistantEntitiesToNavetDevices({
      entities: input.entities,
      areas: input.areas,
      deviceRegistry: input.deviceRegistry,
      entityRegistry: input.entityRegistry,
    }),
    rooms: buildHomeAssistantNavetRooms({
      entities: input.entities,
      areas: input.areas,
      deviceRegistry: input.deviceRegistry,
      entityRegistry: input.entityRegistry,
    }),
  };
}

export function buildHomeyProviderSnapshot(
  snapshot: Parameters<typeof mapHomeySnapshotToNavetDevices>[0]
): NavetProviderSnapshot {
  return {
    providerId: 'homey',
    connected: snapshot.connected,
    devices: mapHomeySnapshotToNavetDevices(snapshot),
    rooms: buildHomeyNavetRooms(snapshot),
  };
}
