import { ZONE_DEFAULTS_BY_DEVICE_TYPE, type ZoneName } from './zone-types';

/**
 * Resolves which zone a card belongs to.
 *
 * Priority:
 * 1. Explicitly stored zone override (`cardZones[id]`)
 * 2. Device/card type default from ZONE_DEFAULTS_BY_DEVICE_TYPE
 * 3. Fall back to 'status'
 */
export function resolveCardZone(
  deviceOrCardType: string | undefined,
  storedZone: ZoneName | undefined
): ZoneName {
  if (storedZone) return storedZone;
  if (deviceOrCardType) return ZONE_DEFAULTS_BY_DEVICE_TYPE[deviceOrCardType] ?? 'status';
  return 'status';
}
