import { getProviderNativeId } from '@navet/core/ids';
import type { ProviderAdminFeatureService } from '@navet/core/provider-feature-services';
import {
  createPlatformRoomReference,
  parsePlatformRoomReference,
} from '@navet/core/provider-room-management';
import {
  createHomeAssistantArea,
  deleteHomeAssistantArea,
  updateHomeAssistantEntityArea,
  updateHomeAssistantEntityName,
} from './homeassistant-service-bridge';

export const homeAssistantAdminFeatureService: ProviderAdminFeatureService = {
  createRoom: async (name) => {
    const area = await createHomeAssistantArea(name);
    return createPlatformRoomReference('home_assistant', area.area_id, area.name);
  },
  updateEntityRoom: async (entityId, roomId) => {
    const parsedRoom = roomId ? parsePlatformRoomReference(roomId) : null;
    if (roomId && parsedRoom?.providerId !== 'home_assistant') {
      throw new Error(`Room ${roomId} does not belong to provider Home Assistant`);
    }

    await updateHomeAssistantEntityArea(
      getProviderNativeId(entityId),
      parsedRoom?.nativeId ?? null
    );
  },
  updateEntityName: async (entityId, name) => {
    await updateHomeAssistantEntityName(getProviderNativeId(entityId), name);
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

    await deleteHomeAssistantArea(parsedRoom.nativeId);
  },
};
