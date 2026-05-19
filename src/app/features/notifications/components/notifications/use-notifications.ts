import { useHaNotificationData } from './use-ha-notification-data';
import { useNotificationActions } from './use-notification-actions';
import { useNotificationList } from './use-notification-list';
import { useNotificationStorage } from './use-notification-storage';

export interface Notification {
  id: string;
  type: 'info' | 'success' | 'warning' | 'error';
  title: string;
  message: string;
  timestamp: Date;
  read: boolean;
  notificationId: string;
  source: 'persistent_notification' | 'update' | 'repair';
  isBusy?: boolean;
  progress?: number | null;
  statusLabel?: string;
  requiresRestart?: boolean;
  installedVersion?: string | null;
  latestVersion?: string | null;
  detailsUrl?: string | null;
}

export interface UseNotificationsReturn {
  notifications: Notification[];
  unreadCount: number;
  runPrimaryAction: (id: string) => Promise<void>;
  markAllAsRead: () => void;
  deleteNotification: (id: string) => Promise<void>;
  clearAll: () => Promise<void>;
}

export function useNotifications(): UseNotificationsReturn {
  const {
    readNotifications,
    setReadNotifications,
    hiddenNotifications,
    setHiddenNotifications,
    pendingUpdateInstalls,
    setPendingUpdateInstalls,
  } = useNotificationStorage();

  const { persistentNotifications, repairIssues } = useHaNotificationData();

  const notifications = useNotificationList({
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
