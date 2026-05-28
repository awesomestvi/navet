import type { Connection } from 'home-assistant-js-websocket';
import type {
  PlatformPersistentNotification,
  PlatformPersistentNotificationEvent,
  PlatformRepairIssue,
} from '@/app/platform/provider-feature-models';
import type { ProviderNotificationFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

function getActiveConnection(connection?: Connection | null) {
  return connection ?? homeAssistantService.getConnection();
}

function isObjectEntry<T extends object>(value: unknown): value is T {
  return typeof value === 'object' && value !== null;
}

export const integrationNotificationFeatureService: ProviderNotificationFeatureService = {
  async getSnapshot(options) {
    const connection = getActiveConnection(options?.connection);
    if (!connection) {
      return {
        persistentNotifications: [],
        repairIssues: [],
      };
    }

    const [persistentNotifications, repairIssues] = await Promise.all([
      connection
        .sendMessagePromise({ type: 'persistent_notification/get' })
        .then((result) =>
          Array.isArray(result)
            ? result.filter((entry): entry is PlatformPersistentNotification =>
                isObjectEntry<PlatformPersistentNotification>(entry)
              )
            : []
        )
        .catch(() => []),
      connection
        .sendMessagePromise({ type: 'repairs/list_issues' })
        .then((result) =>
          Array.isArray(result)
            ? result.filter((entry): entry is PlatformRepairIssue =>
                isObjectEntry<PlatformRepairIssue>(entry)
              )
            : []
        )
        .catch(() => []),
    ]);

    return {
      persistentNotifications,
      repairIssues,
    };
  },
  async subscribePersistentNotifications(callback, options) {
    const connection = getActiveConnection(options?.connection);
    if (!connection) {
      return () => {};
    }

    return await connection.subscribeMessage(
      (event: PlatformPersistentNotificationEvent) => callback(event),
      { type: 'persistent_notification/subscribe' }
    );
  },
};
