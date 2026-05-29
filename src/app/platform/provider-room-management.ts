import type { NavetRoomDescriptor } from '@navet/app/internal/compat-models';
import type {
  PlatformManageableRoomReference,
  PlatformRoomReference,
} from '@/app/platform/provider-feature-models';
import type { IntegrationProviderId } from '@/app/types/provider';
import { createProviderScopedId, parseProviderScopedId } from '@/app/utils/provider-ids';

function toPlatformRoomReference(
  descriptor: NavetRoomDescriptor,
  providerId: IntegrationProviderId
): PlatformManageableRoomReference | null {
  const source = descriptor.sources.find(
    (entry) => entry.providerId === providerId && entry.sourceType === 'provider_managed'
  );
  if (!source) {
    return null;
  }

  return {
    id: createProviderScopedId(providerId, source.nativeId),
    name: descriptor.name,
    providerId,
    canAssign: true,
    canDelete: source.supportsDeletion,
    canOrder: source.supportsOrdering,
  };
}

export function buildManageableRoomReferences(
  roomDescriptors: NavetRoomDescriptor[],
  providerId: IntegrationProviderId
): PlatformManageableRoomReference[] {
  return roomDescriptors
    .map((descriptor) => toPlatformRoomReference(descriptor, providerId))
    .filter((room): room is PlatformManageableRoomReference => room !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

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
