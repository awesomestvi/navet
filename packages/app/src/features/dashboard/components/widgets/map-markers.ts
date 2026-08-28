import type { PlatformEntitySnapshotMap } from '@navet/app/platform/provider-feature-models';
import type { IntegrationUser } from '@navet/app/types/integration-user';
import type { MapMarker } from './map-types';

export function normalizeMarkerName(value: string | undefined) {
  return value?.trim().toLowerCase() ?? '';
}

export function getFirstName(value: string | undefined) {
  const normalized = normalizeMarkerName(value);
  return normalized.split(/\s+/)[0] ?? '';
}

export function readEntityPicture(attributes: Record<string, unknown>) {
  return (
    (typeof attributes.entity_picture === 'string' && attributes.entity_picture) ||
    (typeof attributes.entity_picture_local === 'string' && attributes.entity_picture_local) ||
    undefined
  );
}

export function selectMapMarkersFromEntities(
  entities: PlatformEntitySnapshotMap | null
): MapMarker[] {
  if (!entities) return [];

  const personPicturesByName = new Map<string, string>();
  const personPicturesByFirstName = new Map<string, string>();
  const personPicturesByTrackerId = new Map<string, string>();
  const markers: MapMarker[] = [];

  for (const [id, entity] of Object.entries(entities)) {
    const attrs = entity.attributes as Record<string, unknown>;
    if (id.startsWith('person.')) {
      const entityPicture = readEntityPicture(attrs);
      const friendlyName =
        typeof attrs.friendly_name === 'string' ? attrs.friendly_name : id.replace(/_/g, ' ');
      const normalizedName = normalizeMarkerName(friendlyName);
      const firstName = getFirstName(friendlyName);
      const source = typeof attrs.source === 'string' ? attrs.source : undefined;

      if (entityPicture && normalizedName) {
        personPicturesByName.set(normalizedName, entityPicture);
      }

      if (entityPicture && firstName && !personPicturesByFirstName.has(firstName)) {
        personPicturesByFirstName.set(firstName, entityPicture);
      }

      if (entityPicture && source) {
        personPicturesByTrackerId.set(source, entityPicture);
      }
    }

    if (!id.startsWith('person.') && !id.startsWith('device_tracker.')) {
      continue;
    }

    const lat = attrs.latitude;
    const lon = attrs.longitude;
    if (typeof lat !== 'number' || typeof lon !== 'number') {
      continue;
    }

    const markerName = (attrs.friendly_name as string | undefined) ?? id.replace(/_/g, ' ');
    markers.push({
      id,
      name: markerName,
      latitude: lat,
      longitude: lon,
      entityPicture: readEntityPicture(attrs),
      state: entity.state,
      gpsAccuracy: attrs.gps_accuracy as number | undefined,
    });
  }

  return markers.map((marker) => {
    if (marker.entityPicture) {
      return marker;
    }

    const normalizedMarkerName = normalizeMarkerName(marker.name);
    const markerFirstName = getFirstName(marker.name);
    return {
      ...marker,
      entityPicture:
        personPicturesByTrackerId.get(marker.id) ??
        personPicturesByName.get(normalizedMarkerName) ??
        personPicturesByFirstName.get(markerFirstName),
    };
  });
}

export function applyCurrentUserAvatar(
  markers: readonly MapMarker[],
  currentUser: IntegrationUser | null
): MapMarker[] {
  const avatarUrl = currentUser?.avatarUrl?.trim();
  const normalizedUserName = normalizeMarkerName(currentUser?.name);
  if (!avatarUrl || !normalizedUserName) {
    return [...markers];
  }

  const exactMatches = markers.filter(
    (marker) => normalizeMarkerName(marker.name) === normalizedUserName
  );
  const matchedIds = new Set(exactMatches.map((marker) => marker.id));

  if (matchedIds.size === 0) {
    const userFirstName = getFirstName(normalizedUserName);
    const firstNameMatches = markers.filter(
      (marker) => getFirstName(marker.name) === userFirstName
    );

    if (firstNameMatches.length === 1 && firstNameMatches[0]) {
      matchedIds.add(firstNameMatches[0].id);
    }
  }

  return markers.map((marker) =>
    matchedIds.has(marker.id) && !marker.entityPicture
      ? { ...marker, entityPicture: avatarUrl }
      : marker
  );
}

export function mapMarkersEqual(a: readonly MapMarker[], b: readonly MapMarker[]): boolean {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  return a.every(
    (m, i) =>
      m.id === b[i].id &&
      m.latitude === b[i].latitude &&
      m.longitude === b[i].longitude &&
      m.state === b[i].state &&
      m.gpsAccuracy === b[i].gpsAccuracy &&
      m.entityPicture === b[i].entityPicture
  );
}
