import { createProviderScopedId } from '@navet/core/ids';
import type { ProviderNotificationFeatureService } from '@navet/core/provider-feature-services';
import { homeyService } from './homey-service';

function getSnapshot() {
  return {
    persistentNotifications: Object.values(homeyService.getSnapshot().notifications ?? {}).map(
      (notification) => ({
        notification_id: createProviderScopedId('homey', notification.id),
        title: notification.ownerName || 'Homey',
        message: notification.excerpt,
        created_at: notification.dateCreated,
      })
    ),
    repairIssues: [],
  };
}
export const homeyNotificationFeatureService: ProviderNotificationFeatureService = {
  getSnapshot: async () => getSnapshot(),
  subscribePersistentNotifications: async (callback) =>
    homeyService.subscribe(() =>
      callback({ update_type: 'current', notifications: getSnapshot().persistentNotifications })
    ),
  // Homey's read-only notification permission allows local hiding in Navet, not deletion on the hub.
  dismissPersistentNotification: async () => {},
  installUpdate: async () => {
    throw new Error('Homey app updates are managed in Homey');
  },
  restartSystem: async () => {
    throw new Error('Homey restarts are managed in Homey');
  },
};
