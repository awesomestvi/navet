import type { NavetProviderState } from '@navet/core/types';
import { buildHomeyProviderRooms, mapHomeySnapshotToNavetEntities } from './homey-mappers';
import type { HomeySnapshot } from './homey-types';

export type HomeyProviderStateInput = HomeySnapshot;

export function buildHomeyProviderState(snapshot: HomeyProviderStateInput): NavetProviderState {
  return {
    providerId: 'homey',
    connected: snapshot.connected,
    entities: mapHomeySnapshotToNavetEntities(snapshot),
    rooms: buildHomeyProviderRooms(snapshot),
  };
}
