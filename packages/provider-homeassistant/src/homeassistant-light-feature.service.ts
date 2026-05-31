import type {
  ProviderLightFeatureService,
  ProviderLightUpdateOptions,
} from '@navet/core/provider-feature-services';
import { updateHomeAssistantLight } from './homeassistant-service-bridge';

export const homeAssistantLightFeatureService: ProviderLightFeatureService = {
  updateLight: async (entityId: string, options: ProviderLightUpdateOptions) =>
    await updateHomeAssistantLight(entityId, options),
};
