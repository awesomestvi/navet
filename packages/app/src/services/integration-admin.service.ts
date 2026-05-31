import type { ProviderAdminFeatureService } from '@navet/app/platform/provider-feature-services';
import { parsePlatformRoomReference } from '@navet/app/platform/provider-room-management';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { parseProviderScopedId } from '@navet/app/utils/provider-ids';
import { getCurrentIntegrationProviderIdFromStore } from './integration-provider-context.service';

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
    const service = getProviderRuntimeRegistration(providerId).adminFeatureService;
    if (!service) {
      throw new Error('Room aggregation is not implemented yet for the current integration');
    }
    return await service.createRoom(name);
  },
  updateEntityRoom: async (entityId, roomId) => {
    const providerId = resolveEntityProviderId(entityId);
    const parsedRoom = roomId ? parsePlatformRoomReference(roomId) : null;
    if (roomId && (!parsedRoom || parsedRoom.providerId !== providerId)) {
      throw new Error(`Room ${roomId} does not belong to provider ${getProviderLabel(providerId)}`);
    }

    const service = getProviderRuntimeRegistration(providerId).adminFeatureService;
    if (!service) {
      throw new Error('Room aggregation is not implemented yet for the current integration');
    }
    await service.updateEntityRoom(entityId, roomId);
  },
  updateEntityName: async (entityId, name) => {
    const providerId = resolveEntityProviderId(entityId);
    const service = getProviderRuntimeRegistration(providerId).adminFeatureService;
    if (!service) {
      throw new Error('Room aggregation is not implemented yet for the current integration');
    }
    await service.updateEntityName(entityId, name);
  },
  deleteRoom: async (roomId) => {
    const parsedRoom = parsePlatformRoomReference(roomId);
    if (!parsedRoom) {
      throw new Error(`Invalid room reference: ${roomId}`);
    }

    const service = getProviderRuntimeRegistration(parsedRoom.providerId).adminFeatureService;
    if (!service) {
      throw new Error('Room aggregation is not implemented yet for the current integration');
    }
    await service.deleteRoom(roomId);
  },
};
