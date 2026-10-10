import type { ProviderNotificationFeatureService } from '@navet/core/provider-feature-services';
import { createSessionBoundFeatureLoader } from './homeassistant-lazy-feature-service';

const withService = createSessionBoundFeatureLoader(async () => {
  const module = await import('./homeassistant-notification-feature.service');
  return module.homeAssistantNotificationFeatureService;
});

export const lazyHomeAssistantNotificationFeatureService: ProviderNotificationFeatureService = {
  getSnapshot: (options) => withService((service) => service.getSnapshot(options)),
  subscribePersistentNotifications: (listener, options) =>
    withService((service) => service.subscribePersistentNotifications(listener, options)),
  dismissPersistentNotification: (id) =>
    withService((service) => service.dismissPersistentNotification(id)),
  installUpdate: (id) => withService((service) => service.installUpdate(id)),
  restartSystem: () => withService((service) => service.restartSystem()),
  getDeliveryTargets: (options) =>
    withService((service) => service.getDeliveryTargets?.(options) ?? Promise.resolve([])),
  sendNotification: (request) =>
    withService((service) => {
      if (!service.sendNotification) throw new Error('Home Assistant cannot send notifications');
      return service.sendNotification(request);
    }),
};
