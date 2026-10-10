import type { ProviderChoreProjectionFeatureService } from '@navet/core/provider-feature-services';

import { createSessionBoundFeatureLoader } from './homeassistant-lazy-feature-service';

async function getService(): Promise<ProviderChoreProjectionFeatureService> {
  const module = await import('./homeassistant-chore-projection-feature.service');
  return module.homeAssistantChoreProjectionFeatureService;
}

const withService = createSessionBoundFeatureLoader(getService);

export const lazyHomeAssistantChoreProjectionFeatureService: ProviderChoreProjectionFeatureService =
  {
    async publishSnapshot(snapshot) {
      return withService((service) => service.publishSnapshot(snapshot));
    },
    async subscribeActionRequests(listener) {
      return withService((service) =>
        service.subscribeActionRequests ? service.subscribeActionRequests(listener) : () => {}
      );
    },
  };
