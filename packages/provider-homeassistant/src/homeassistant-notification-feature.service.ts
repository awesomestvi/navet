import type {
  PlatformMessageClient,
  PlatformPersistentNotification,
  PlatformPersistentNotificationEvent,
  PlatformRepairIssue,
} from '@navet/core/provider-feature-models';
import type { ProviderNotificationFeatureService } from '@navet/core/provider-feature-services';
import {
  callHomeAssistantService,
  getHomeAssistantConnection,
} from './homeassistant-service-bridge';

function getActiveMessageClient(messageClient?: PlatformMessageClient | null) {
  return messageClient ?? getHomeAssistantConnection();
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
    await callHomeAssistantService(
      'persistent_notification',
      'dismiss',
      { notification_id: notificationId },
      undefined
    ),
  installUpdate: async (entityId) =>
    await callHomeAssistantService('update', 'install', {}, { entity_id: entityId }),
  restartSystem: async () =>
    await callHomeAssistantService('homeassistant', 'restart', {}, undefined),
};
