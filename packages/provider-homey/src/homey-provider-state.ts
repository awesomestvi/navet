import type { NavetProviderState } from '@navet/core/types';
import { buildHomeyProviderRooms, mapHomeySnapshotToNavetEntities } from './homey-mappers';
import type { HomeySnapshot } from './homey-types';

export type HomeyProviderStateInput = HomeySnapshot;

export function buildHomeyProviderState(snapshot: HomeyProviderStateInput): NavetProviderState {
  return {
    providerId: 'homey',
    connected: snapshot.connected,
    connecting: false,
    reconnecting: false,
    entitiesHydrated: Object.keys(snapshot.devices).length > 0,
    registriesHydrated: true,
    error: snapshot.error ?? null,
    unreachable: snapshot.unreachable ?? false,
    entities: mapHomeySnapshotToNavetEntities(snapshot),
    rooms: buildHomeyProviderRooms(snapshot),
  };
}
