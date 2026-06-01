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

const HTML_ENTITY_REPLACEMENTS: Record<string, string> = {
  '&amp;': '&',
  '&apos;': "'",
  '&gt;': '>',
  '&lt;': '<',
  '&nbsp;': ' ',
  '&quot;': '"',
};

function getActiveMessageClient(messageClient?: PlatformMessageClient | null) {
  return messageClient ?? getHomeAssistantConnection();
}

function isObjectEntry<T extends object>(value: unknown): value is T {
  return typeof value === 'object' && value !== null;
}

function decodeHtmlEntities(value: string) {
  return value.replace(
    /&(amp|apos|gt|lt|nbsp|quot);/g,
    (entity) => HTML_ENTITY_REPLACEMENTS[entity] ?? entity
  );
}

function normalizePersistentNotificationMessage(message?: string) {
  if (typeof message !== 'string' || message.trim().length === 0) {
    return message;
  }

  return decodeHtmlEntities(
    message
      .replace(/<br\s*\/?>/gi, '\n')
      .replace(/<\/(ha-alert|p|div|li|ul|ol|h[1-6])>/gi, '\n')
      .replace(/<li\b[^>]*>/gi, '- ')
      .replace(/<[^>]+>/g, ' ')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .replace(/[ \t]{2,}/g, ' ')
      .trim()
  );
}

function normalizePersistentNotification(
  notification: PlatformPersistentNotification
): PlatformPersistentNotification {
  return {
    ...notification,
    message: normalizePersistentNotificationMessage(notification.message),
  };
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
            ? result
                .filter((entry): entry is PlatformPersistentNotification =>
                  isObjectEntry<PlatformPersistentNotification>(entry)
                )
                .map(normalizePersistentNotification)
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
      (event: PlatformPersistentNotificationEvent) =>
        callback({
          ...event,
          notifications: Array.isArray(event.notifications)
            ? event.notifications
                .filter((entry): entry is PlatformPersistentNotification =>
                  isObjectEntry<PlatformPersistentNotification>(entry)
                )
                .map(normalizePersistentNotification)
            : event.notifications,
        }),
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
    await callHomeAssistantService('update', 'install', {}, { entityId: entityId }),
  restartSystem: async () =>
    await callHomeAssistantService('homeassistant', 'restart', {}, undefined),
};
