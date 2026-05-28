import { authSessionManager } from '@/app/infrastructure/home-assistant/auth/auth-session-manager';
import type { ProviderNotificationFeatureService } from '@/app/platform/provider-feature-services';
import { parseProviderScopedId } from '@/app/utils/provider-ids';
import {
  getIntegrationProviderAdapter,
  getIntegrationProviderNotificationFeatureService,
  hasIntegrationProviderFeature,
} from './integration-registry.service';

function resolveNotificationProviderId(entityId?: string) {
  return (
    (entityId ? parseProviderScopedId(entityId)?.providerId : null) ??
    authSessionManager.getSnapshot().providerId
  );
}

function getNotificationFeatureService(providerId = authSessionManager.getSnapshot().providerId) {
  const adapter = getIntegrationProviderAdapter(providerId);
  if (!hasIntegrationProviderFeature(adapter, 'notifications')) {
    throw new Error('Notifications are not supported for the current integration yet');
  }

  return getIntegrationProviderNotificationFeatureService(providerId);
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
    const adapter = getIntegrationProviderAdapter(providerId);
    if (!hasIntegrationProviderFeature(adapter, 'notifications')) {
      throw new Error('Update installation is not supported for the current integration yet');
    }

    const service = getIntegrationProviderNotificationFeatureService(providerId);
    return service.installUpdate(parseProviderScopedId(entityId)?.nativeId ?? entityId);
  },
  restartSystem: async () => {
    const service = getNotificationFeatureService();
    await service.restartSystem();
  },
};
