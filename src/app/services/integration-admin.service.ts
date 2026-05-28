import type { ProviderAdminFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

export const integrationAdminService: ProviderAdminFeatureService = {
  createArea: (name) => homeAssistantService.createArea(name),
  updateEntityArea: (entityId, areaId) => homeAssistantService.updateEntityArea(entityId, areaId),
  deleteArea: (areaId) => homeAssistantService.deleteArea(areaId),
};
