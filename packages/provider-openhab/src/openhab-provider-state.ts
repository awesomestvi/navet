import type { NavetProviderState } from '@navet/core/types';
import { buildOpenHABProviderRooms, mapOpenHABSnapshotToNavetEntities } from './openhab-mappers';
import type { OpenHABSnapshot } from './openhab-types';

export type OpenHABProviderStateInput = OpenHABSnapshot;

export function buildOpenHABProviderState(snapshot: OpenHABProviderStateInput): NavetProviderState {
  return {
    providerId: 'openhab',
    connected: snapshot.connected,
    entities: mapOpenHABSnapshotToNavetEntities(snapshot),
    rooms: buildOpenHABProviderRooms(snapshot),
  };
}
