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
import { parseProviderScopedId } from '@/app/utils/provider-ids';

function getActiveMessageClient(messageClient?: PlatformMessageClient | null) {
  return messageClient ?? homeAssistantService.getConnection();
}

function isObjectEntry<T extends object>(value: unknown): value is T {
  return typeof value === 'object' && value !== null;
}

function requireHomeAssistantUpdateProvider(entityId: string) {
  const providerScope = parseProviderScopedId(entityId);
  if (providerScope && providerScope.providerId !== 'home_assistant') {
    throw new Error('Update installation is not supported for the current integration yet');
  }

  return providerScope?.nativeId ?? entityId;
}

export const integrationNotificationFeatureService: ProviderNotificationFeatureService = {
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
      entityId: requireHomeAssistantUpdateProvider(entityId),
      domain: 'update',
      service: 'install',
    }),
  restartSystem: () =>
    dispatchServiceAction({
      domain: 'homeassistant',
      service: 'restart',
    }),
};
