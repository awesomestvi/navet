import type {
  PlatformMessageClient,
  PlatformPersistentNotification,
  PlatformPersistentNotificationEvent,
  PlatformRepairIssue,
} from '@/app/platform/provider-feature-models';
import type { ProviderNotificationFeatureService } from '@/app/platform/provider-feature-services';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import {
  dispatchEntityAction,
  dispatchServiceAction,
} from '@/app/services/integration-action.service';

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
  dismissPersistentNotification: (notificationId) =>
    dispatchServiceAction({
      domain: 'persistent_notification',
      service: 'dismiss',
      serviceData: {
        notification_id: notificationId,
      },
    }),
  installUpdate: (entityId) =>
    dispatchEntityAction({
      entityId,
      domain: 'update',
      service: 'install',
    }),
  restartSystem: () =>
    dispatchServiceAction({
      domain: 'homeassistant',
      service: 'restart',
    }),
};
