import { getProviderNativeId } from '@navet/core/ids';
import type { ProviderAdminFeatureService } from '@navet/core/provider-feature-services';
import {
  createPlatformRoomReference,
  parsePlatformRoomReference,
} from '@navet/core/provider-room-management';
import {
  createHomeAssistantArea,
  deleteHomeAssistantArea,
  renameHomeAssistantArea,
  updateHomeAssistantEntityArea,
  updateHomeAssistantEntityName,
} from './homeassistant-service-bridge';

export const homeAssistantAdminFeatureService: ProviderAdminFeatureService = {
  createRoom: async (name) => {
    const area = await createHomeAssistantArea(name);
    return createPlatformRoomReference('home_assistant', area.area_id, area.name);
  },
  renameRoom: async (roomId, name) => {
    const parsedRoom = parsePlatformRoomReference(roomId);
    if (parsedRoom?.providerId !== 'home_assistant') {
      throw new Error(`Room ${roomId} does not belong to provider Home Assistant`);
    }

    const area = await renameHomeAssistantArea(parsedRoom.nativeId, name);
    return createPlatformRoomReference('home_assistant', area.area_id, area.name);
  },
  assignEntityToRoom: async (entityId, roomId) => {
    const parsedRoom = parsePlatformRoomReference(roomId);
    if (parsedRoom?.providerId !== 'home_assistant') {
      throw new Error(`Room ${roomId} does not belong to provider Home Assistant`);
    }

    await updateHomeAssistantEntityArea(getProviderNativeId(entityId), parsedRoom.nativeId);
  },
  unassignEntityFromRoom: async (entityId) => {
    await updateHomeAssistantEntityArea(getProviderNativeId(entityId), null);
  },
  updateEntityRoom: async (entityId, roomId) => {
    if (roomId) {
      await homeAssistantAdminFeatureService.assignEntityToRoom(entityId, roomId);
      return;
    }

    await homeAssistantAdminFeatureService.unassignEntityFromRoom(entityId);
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
