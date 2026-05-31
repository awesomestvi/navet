import type { NavetRoomDescriptor } from '@navet/app/provider-models';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import {
  createPlatformRoomReference,
  type PlatformManageableRoomReference,
  parsePlatformRoomReference,
} from '@navet/core';

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
    ...createPlatformRoomReference(providerId, source.nativeId, descriptor.name),
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

export { createPlatformRoomReference, parsePlatformRoomReference };
