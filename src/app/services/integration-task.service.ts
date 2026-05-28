import type { ProviderTaskFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

export const integrationTaskService: ProviderTaskFeatureService = {
  selectTaskRuntimeSnapshot: (state) => ({
    entities: state.homeAssistant.entities,
    areas: state.homeAssistant.areas,
    deviceRegistry: state.homeAssistant.deviceRegistry,
    entityRegistry: state.homeAssistant.entityRegistry,
  }),
  getAutomationConfig: (entityId) => homeAssistantService.getAutomationConfig(entityId),
};
