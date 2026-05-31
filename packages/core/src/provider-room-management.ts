import { createProviderScopedId, parseProviderScopedId } from './ids';
import type { IntegrationProviderId } from './integration-providers';
import type { PlatformRoomReference } from './provider-feature-models';

export function createPlatformRoomReference(
  providerId: IntegrationProviderId,
  nativeId: string,
  name: string
): PlatformRoomReference {
  return {
    id: createProviderScopedId(providerId, nativeId),
    name,
    providerId,
  };
}

export function parsePlatformRoomReference(
  roomId: string
): { providerId: IntegrationProviderId; nativeId: string } | null {
  return parseProviderScopedId(roomId);
}
