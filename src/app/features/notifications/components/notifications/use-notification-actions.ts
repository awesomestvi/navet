import { useCallback } from 'react';
import { homeAssistantService } from '@/app/services/home-assistant.service';
import type { Notification } from './use-notifications';

interface UseNotificationActionsParams {
  notifications: Notification[];
  setReadNotifications: React.Dispatch<React.SetStateAction<string[]>>;
  setHiddenNotifications: React.Dispatch<React.SetStateAction<string[]>>;
  setPendingUpdateInstalls: React.Dispatch<React.SetStateAction<string[]>>;
}

export interface NotificationActions {
  runPrimaryAction: (id: string) => Promise<void>;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useNotificationActions({
  notifications,
  setReadNotifications,
  setHiddenNotifications,
  setPendingUpdateInstalls,
}: UseNotificationActionsParams): NotificationActions {
  const markAsRead = useCallback(
    (id: string) => {
      setReadNotifications((current) => (current.includes(id) ? current : [...current, id]));
    },
    [setReadNotifications]
  );

  const runPrimaryAction = useCallback(
    async (id: string) => {
      const notification = notifications.find((entry) => entry.id === id);
      if (!notification) return;

      if (notification.source === 'update') {
        if (notification.requiresRestart) {
          await homeAssistantService.callService('homeassistant', 'restart');
          setPendingUpdateInstalls((current) => current.filter((entityId) => entityId !== id));
          markAsRead(id);
          return;
        }
        setPendingUpdateInstalls((current) => (current.includes(id) ? current : [...current, id]));
        await homeAssistantService.callService(
          'update',
          'install',
          {},
          { entity_id: notification.id }
        );
      }

      markAsRead(id);
    },
    [markAsRead, notifications, setPendingUpdateInstalls]
  );

  const markAllAsRead = useCallback(() => {
    setReadNotifications(notifications.map((notification) => notification.id));
  }, [notifications, setReadNotifications]);

  const deleteNotification = useCallback(
    async (id: string) => {
      const notification = notifications.find((entry) => entry.id === id);
      if (!notification) return;

      setHiddenNotifications((current) => (current.includes(id) ? current : [...current, id]));
      setReadNotifications((current) => current.filter((entry) => entry !== id));

      if (notification.source === 'persistent_notification') {
        try {
          await homeAssistantService.callService('persistent_notification', 'dismiss', {
            notification_id: notification.notificationId,
          });
        } catch {
          // Keep the item hidden locally even if HA rejects or delays dismissal.
        }
      }
    },
    [notifications, setHiddenNotifications, setReadNotifications]
  );

  const clearAll = useCallback(async () => {
    if (!notifications.length) return;

    const notificationIds = notifications.map((notification) => notification.id);
    setHiddenNotifications((current) => [...new Set([...current, ...notificationIds])]);
    setReadNotifications([]);

    await Promise.allSettled(
      notifications
        .filter((notification) => notification.source === 'persistent_notification')
        .map((notification) =>
          homeAssistantService.callService('persistent_notification', 'dismiss', {
            notification_id: notification.notificationId,
          })
        )
    );
  }, [notifications, setHiddenNotifications, setReadNotifications]);

  return { runPrimaryAction, markAllAsRead, deleteNotification, clearAll };
}
