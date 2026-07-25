import type { IntegrationRoomDescriptor } from '@navet/app/stores/integration-models';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import {
  createPlatformRoomReference,
  type PlatformManageableRoomReference,
  type ProviderRoomManagementCapabilities,
  parsePlatformRoomReference,
} from '@navet/core';

function toPlatformRoomReference(
  descriptor: IntegrationRoomDescriptor,
  providerId: IntegrationProviderId,
  capabilities: ProviderRoomManagementCapabilities
): PlatformManageableRoomReference | null {
  const source = descriptor.sources.find(
    (entry) => entry.providerId === providerId && entry.sourceType === 'provider_managed'
  );
  if (!source) {
    return null;
  }

  return {
    ...createPlatformRoomReference(providerId, source.nativeId, descriptor.name),
    canAssign: capabilities.assign,
    canDelete: capabilities.delete && source.supportsDeletion,
    canOrder: source.supportsOrdering,
    roomManagementCapabilities: capabilities,
  };
}

export function buildManageableRoomReferences(
  roomDescriptors: IntegrationRoomDescriptor[],
  providerId: IntegrationProviderId,
  capabilities: ProviderRoomManagementCapabilities
): PlatformManageableRoomReference[] {
  if (capabilities.providerId !== providerId) {
    throw new Error(
      `Room management capabilities for ${capabilities.providerId} cannot describe ${providerId} rooms`
    );
  }

  return roomDescriptors
    .map((descriptor) => toPlatformRoomReference(descriptor, providerId, capabilities))
    .filter((room): room is PlatformManageableRoomReference => room !== null)
    .sort((left, right) => left.name.localeCompare(right.name));
}

export { createPlatformRoomReference, parsePlatformRoomReference };
