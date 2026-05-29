import type {
  ProviderLightFeatureService,
  ProviderLightUpdateOptions,
} from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

export const homeAssistantLightFeatureService: ProviderLightFeatureService = {
  updateLight: async (entityId: string, options: ProviderLightUpdateOptions) =>
    await homeAssistantService.updateLight(entityId, options),
};
