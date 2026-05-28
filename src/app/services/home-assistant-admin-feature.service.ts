import type { ProviderAdminFeatureService } from '@/app/platform/provider-feature-services';
import {
  createPlatformRoomReference,
  parsePlatformRoomReference,
} from '@/app/platform/provider-room-management';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import { getProviderNativeId } from '@/app/utils/provider-ids';

export const homeAssistantAdminFeatureService: ProviderAdminFeatureService = {
  createRoom: async (name) => {
    const area = await homeAssistantService.createArea(name);
    return createPlatformRoomReference('home_assistant', area.area_id, area.name);
  },
  updateEntityRoom: async (entityId, roomId) => {
    const parsedRoom = roomId ? parsePlatformRoomReference(roomId) : null;
    if (roomId && (!parsedRoom || parsedRoom.providerId !== 'home_assistant')) {
      throw new Error(`Room ${roomId} does not belong to provider Home Assistant`);
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

    if (parsedRoom.providerId !== 'home_assistant') {
      throw new Error(
        `Room management is not implemented yet for provider ${parsedRoom.providerId}`
      );
    }

    await homeAssistantService.deleteArea(parsedRoom.nativeId);
  },
};
