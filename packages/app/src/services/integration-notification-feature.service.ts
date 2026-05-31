import type { ProviderNotificationFeatureService } from '@navet/app/platform/provider-feature-services';
import {
  getProviderRuntimeRegistration,
  hasProviderFeature,
} from '@navet/app/provider-runtime-registry';
import {
  getCurrentIntegrationProviderIdFromStore,
  getNativeIntegrationEntityId,
  resolveIntegrationProviderId,
} from './integration-provider-context.service';

function resolveNotificationProviderId(entityId?: string) {
  return resolveIntegrationProviderId(entityId);
}

function getNotificationFeatureService(providerId = getCurrentIntegrationProviderIdFromStore()) {
  if (!hasProviderFeature(providerId, 'notifications')) {
    throw new Error('Notifications are not supported for the current integration yet');
  }
  const service = getProviderRuntimeRegistration(providerId).notificationFeatureService;
  if (!service) {
    throw new Error('Notifications are not implemented yet for the current integration');
  }
  return service;
}

export const integrationNotificationFeatureService: ProviderNotificationFeatureService = {
  async getSnapshot(options) {
    const service = getNotificationFeatureService();
    return await service.getSnapshot(options);
  },
  async subscribePersistentNotifications(callback, options) {
    const service = getNotificationFeatureService();
    return await service.subscribePersistentNotifications(callback, options);
  },
  dismissPersistentNotification: async (notificationId) => {
    const service = getNotificationFeatureService();
    await service.dismissPersistentNotification(notificationId);
  },
  installUpdate: (entityId) => {
    const providerId = resolveNotificationProviderId(entityId);
    if (!hasProviderFeature(providerId, 'notifications')) {
      throw new Error('Update installation is not supported for the current integration yet');
    }
    const service = getProviderRuntimeRegistration(providerId).notificationFeatureService;
    if (!service) {
      throw new Error('Notifications are not implemented yet for the current integration');
    }
    return service.installUpdate(getNativeIntegrationEntityId(entityId));
  },
  restartSystem: async () => {
    const service = getNotificationFeatureService();
    await service.restartSystem();
  },
};
