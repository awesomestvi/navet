import type { ProviderHistoryFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

export const homeAssistantHistoryFeatureService: ProviderHistoryFeatureService = {
  getMessageClient: () => homeAssistantService.getConnection(),
};
