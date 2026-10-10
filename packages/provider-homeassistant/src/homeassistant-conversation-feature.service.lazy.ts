import type { ProviderConversationFeatureService } from '@navet/core/provider-feature-services';
import { createSessionBoundFeatureLoader } from './homeassistant-lazy-feature-service';

const withService = createSessionBoundFeatureLoader(async () => {
  const module = await import('./homeassistant-conversation-feature.service');
  return module.homeAssistantConversationFeatureService;
});

export const lazyHomeAssistantConversationFeatureService: ProviderConversationFeatureService = {
  getPipelines: () => withService((service) => service.getPipelines()),
  startTextConversation: (request, listener) =>
    withService((service) => service.startTextConversation(request, listener)),
  startVoiceConversation: (request, listener) =>
    withService((service) => service.startVoiceConversation(request, listener)),
};
