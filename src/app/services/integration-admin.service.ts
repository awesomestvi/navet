import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import type { ProviderAdminFeatureService } from '@/app/platform/provider-feature-services';
import {
  createPlatformRoomReference,
  parsePlatformRoomReference,
} from '@/app/platform/provider-room-management';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import type { IntegrationProviderId } from '@/app/types/provider';
import { getProviderNativeId, parseProviderScopedId } from '@/app/utils/provider-ids';

function getCurrentProviderId(): IntegrationProviderId {
  return authSessionManager.getSnapshot().providerId ?? 'home_assistant';
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

function assertHomeAssistantRoomManagement(providerId: IntegrationProviderId): void {
  if (providerId !== 'home_assistant') {
    throw new Error(
      `Room management is not implemented yet for provider ${getProviderLabel(providerId)}`
    );
  }
}

function resolveEntityProviderId(entityId: string): IntegrationProviderId {
  return parseProviderScopedId(entityId)?.providerId ?? getCurrentProviderId();
}

export const integrationAdminService: ProviderAdminFeatureService = {
  createRoom: async (name) => {
    const providerId = getCurrentProviderId();
    assertHomeAssistantRoomManagement(providerId);
    const area = await homeAssistantService.createArea(name);
    return createPlatformRoomReference(providerId, area.area_id, area.name);
  },
  updateEntityRoom: async (entityId, roomId) => {
    const providerId = resolveEntityProviderId(entityId);
    assertHomeAssistantRoomManagement(providerId);

    const parsedRoom = roomId ? parsePlatformRoomReference(roomId) : null;
    if (roomId && (!parsedRoom || parsedRoom.providerId !== providerId)) {
      throw new Error(`Room ${roomId} does not belong to provider ${getProviderLabel(providerId)}`);
    }

    await homeAssistantService.updateEntityArea(
      getProviderNativeId(entityId),
      parsedRoom?.nativeId ?? null
    );
  },
  deleteRoom: async (roomId) => {
    const parsedRoom = parsePlatformRoomReference(roomId);
    if (!parsedRoom) {
      throw new Error(`Invalid room reference: ${roomId}`);
    }

    assertHomeAssistantRoomManagement(parsedRoom.providerId);
    await homeAssistantService.deleteArea(parsedRoom.nativeId);
  },
};
