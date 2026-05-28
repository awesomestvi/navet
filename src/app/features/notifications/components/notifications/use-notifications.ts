import type { PlatformNotification } from '@/app/platform/provider-feature-models';
import { useNotificationActions } from './use-notification-actions';
import { useNotificationStorage } from './use-notification-storage';
import { useProviderNotificationData } from './use-provider-notification-data';
import { useProviderNotificationList } from './use-provider-notification-list';

export type { PlatformNotification };
export type Notification = PlatformNotification;

export interface PlatformNotificationsReturn {
  notifications: PlatformNotification[];
  unreadCount: number;
  runPrimaryAction: (id: string) => Promise<void>;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useNotifications(): PlatformNotificationsReturn {
  const {
    readNotifications,
    setReadNotifications,
    hiddenNotifications,
    setHiddenNotifications,
    pendingUpdateInstalls,
    setPendingUpdateInstalls,
  } = useNotificationStorage();

  const { persistentNotifications, repairIssues } = useProviderNotificationData();

  const notifications = useProviderNotificationList({
    persistentNotifications,
    repairIssues,
    readNotifications,
    hiddenNotifications,
    pendingUpdateInstalls,
  });

  const { runPrimaryAction, markAllAsRead, deleteNotification, clearAll } = useNotificationActions({
    notifications,
    setReadNotifications,
    setHiddenNotifications,
    setPendingUpdateInstalls,
  });

  const unreadCount = notifications.filter((notification) => !notification.read).length;

  return {
    notifications,
    unreadCount,
    runPrimaryAction,
    markAllAsRead,
    deleteNotification,
    clearAll,
  };
}
