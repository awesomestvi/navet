import type { ProviderAdminFeatureService } from '@navet/core/provider-feature-services';

import { createSessionBoundFeatureLoader } from './homeassistant-lazy-feature-service';

async function getService(): Promise<ProviderAdminFeatureService> {
  const module = await import('./homeassistant-admin-feature.service');
  return module.homeAssistantAdminFeatureService;
}

const withService = createSessionBoundFeatureLoader(getService);

export const lazyHomeAssistantAdminFeatureService: ProviderAdminFeatureService = {
  async createRoom(name) {
    return withService((service) => service.createRoom(name));
  },
  async renameRoom(roomId, name) {
    return withService((service) => service.renameRoom(roomId, name));
  },
  async assignEntityToRoom(entityId, roomId) {
    return withService((service) => service.assignEntityToRoom(entityId, roomId));
  },
  async unassignEntityFromRoom(entityId) {
    return withService((service) => service.unassignEntityFromRoom(entityId));
  },
  async updateEntityRoom(entityId, roomId) {
    return withService((service) => service.updateEntityRoom(entityId, roomId));
  },
  async updateEntityName(entityId, name) {
    return withService((service) => service.updateEntityName(entityId, name));
  },
  async deleteRoom(roomId) {
    return withService((service) => service.deleteRoom(roomId));
  },
};
