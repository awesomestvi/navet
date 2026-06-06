import type { ProviderNotificationFeatureService } from '@navet/app/platform/provider-feature-services';
import {
  resolveCurrentProviderService,
  resolveProviderFeatureService,
} from './integration-provider-service';

export const integrationNotificationFeatureService: ProviderNotificationFeatureService = {
  async getSnapshot(options) {
    const { service } = resolveCurrentProviderService({
      feature: 'notifications',
      getService: (registration) => registration.notificationFeatureService,
      unsupportedMessage: 'Notifications are not supported for the current integration yet',
      missingMessage: 'Notifications are not implemented yet for the current integration',
    });
    return await service.getSnapshot(options);
  },
  async subscribePersistentNotifications(callback, options) {
    const { service } = resolveCurrentProviderService({
      feature: 'notifications',
      getService: (registration) => registration.notificationFeatureService,
      unsupportedMessage: 'Notifications are not supported for the current integration yet',
      missingMessage: 'Notifications are not implemented yet for the current integration',
    });
    return await service.subscribePersistentNotifications(callback, options);
  },
  dismissPersistentNotification: async (notificationId) => {
    const { service } = resolveCurrentProviderService({
      feature: 'notifications',
      getService: (registration) => registration.notificationFeatureService,
      unsupportedMessage: 'Notifications are not supported for the current integration yet',
      missingMessage: 'Notifications are not implemented yet for the current integration',
    });
    await service.dismissPersistentNotification(notificationId);
  },
  installUpdate: (entityId) => {
    const { nativeEntityId, service } = resolveProviderFeatureService({
      entityId,
      feature: 'notifications',
      getService: (registration) => registration.notificationFeatureService,
      unsupportedMessage: 'Update installation is not supported for the current integration yet',
      missingMessage: 'Notifications are not implemented yet for the current integration',
    });
    if (!nativeEntityId) {
      throw new Error('Update installation requires an entity id');
    }
    return service.installUpdate(nativeEntityId);
  },
  restartSystem: async () => {
    const { service } = resolveCurrentProviderService({
      feature: 'notifications',
      getService: (registration) => registration.notificationFeatureService,
      unsupportedMessage: 'Notifications are not supported for the current integration yet',
      missingMessage: 'Notifications are not implemented yet for the current integration',
    });
    await service.restartSystem();
  },
};
