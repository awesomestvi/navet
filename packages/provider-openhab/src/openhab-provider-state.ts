import type { NavetProviderState } from '@navet/core/types';
import { buildOpenHABProviderRooms, mapOpenHABSnapshotToNavetEntities } from './openhab-mappers';
import type { OpenHABSnapshot } from './openhab-types';

export type OpenHABProviderStateInput = OpenHABSnapshot;

export function buildOpenHABProviderState(snapshot: OpenHABProviderStateInput): NavetProviderState {
  return {
    providerId: 'openhab',
    connected: snapshot.connected,
    connecting: false,
    reconnecting: snapshot.reconnecting ?? false,
    entitiesHydrated: Object.keys(snapshot.items).length > 0,
    registriesHydrated: Object.keys(snapshot.items).length > 0,
    error: snapshot.error ?? null,
    entities: mapOpenHABSnapshotToNavetEntities(snapshot),
    rooms: buildOpenHABProviderRooms(snapshot),
  };
}
