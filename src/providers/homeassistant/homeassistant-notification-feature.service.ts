import type {
  PlatformMessageClient,
  PlatformPersistentNotification,
  PlatformPersistentNotificationEvent,
  PlatformRepairIssue,
} from '@/app/platform/provider-feature-models';
import type { ProviderNotificationFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';

function getActiveMessageClient(messageClient?: PlatformMessageClient | null) {
  return messageClient ?? homeAssistantService.getConnection();
}

function isObjectEntry<T extends object>(value: unknown): value is T {
  return typeof value === 'object' && value !== null;
}

export const homeAssistantNotificationFeatureService: ProviderNotificationFeatureService = {
  async getSnapshot(options) {
    const messageClient = getActiveMessageClient(options?.messageClient);
    if (!messageClient) {
      return {
        persistentNotifications: [],
        repairIssues: [],
      };
    }

    const [persistentNotifications, repairIssues] = await Promise.all([
      messageClient
        .sendMessagePromise({ type: 'persistent_notification/get' })
        .then((result) =>
          Array.isArray(result)
            ? result.filter((entry): entry is PlatformPersistentNotification =>
                isObjectEntry<PlatformPersistentNotification>(entry)
              )
            : []
        )
        .catch(() => []),
      messageClient
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
    const messageClient = getActiveMessageClient(options?.messageClient);
    if (!messageClient?.subscribeMessage) {
      return () => {};
    }

    return await messageClient.subscribeMessage(
      (event: PlatformPersistentNotificationEvent) => callback(event),
      { type: 'persistent_notification/subscribe' }
    );
  },
  dismissPersistentNotification: async (notificationId) =>
    await homeAssistantService.callService(
      'persistent_notification',
      'dismiss',
      { notification_id: notificationId },
      undefined
    ),
  installUpdate: async (entityId) =>
    await homeAssistantService.callService('update', 'install', {}, { entity_id: entityId }),
  restartSystem: async () =>
    await homeAssistantService.callService('homeassistant', 'restart', {}, undefined),
};
