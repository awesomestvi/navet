import type { ProviderAdminFeatureService } from '@/app/platform/provider-feature-services';
import { parsePlatformRoomReference } from '@/app/platform/provider-room-management';
import type { IntegrationProviderId } from '@/app/types/provider';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import { getCurrentIntegrationProviderIdFromStore } from './integration-provider-context.service';
import { getIntegrationProviderAdminFeatureService } from './integration-registry.service';

function getCurrentProviderId(): IntegrationProviderId {
  return getCurrentIntegrationProviderIdFromStore();
}

function getProviderLabel(providerId: IntegrationProviderId): string {
  switch (providerId) {
    case 'homey':
      return 'Homey';
    case 'openhab':
      return 'openHAB';
    default:
      return 'Home Assistant';
  }
}

function resolveEntityProviderId(entityId: string): IntegrationProviderId {
  return parseProviderScopedId(entityId)?.providerId ?? getCurrentProviderId();
}

export const integrationAdminService: ProviderAdminFeatureService = {
  createRoom: async (name) => {
    const providerId = getCurrentProviderId();
    return await getIntegrationProviderAdminFeatureService(providerId).createRoom(name);
  },
  updateEntityRoom: async (entityId, roomId) => {
    const providerId = resolveEntityProviderId(entityId);
    const parsedRoom = roomId ? parsePlatformRoomReference(roomId) : null;
    if (roomId && (!parsedRoom || parsedRoom.providerId !== providerId)) {
      throw new Error(`Room ${roomId} does not belong to provider ${getProviderLabel(providerId)}`);
    }

    await getIntegrationProviderAdminFeatureService(providerId).updateEntityRoom(entityId, roomId);
  },
  updateEntityName: async (entityId, name) => {
    const providerId = resolveEntityProviderId(entityId);
    await getIntegrationProviderAdminFeatureService(providerId).updateEntityName(entityId, name);
  },
  deleteRoom: async (roomId) => {
    const parsedRoom = parsePlatformRoomReference(roomId);
    if (!parsedRoom) {
      throw new Error(`Invalid room reference: ${roomId}`);
    }

    await getIntegrationProviderAdminFeatureService(parsedRoom.providerId).deleteRoom(roomId);
  },
};
