import { useMemo } from 'react';
import { useNotificationList } from './use-notification-list';
import { useNotificationStorage } from './use-notification-storage';
import { useProviderNotificationData } from './use-provider-notification-data';

export function useNotificationBadgeCount(options?: { includeUpdates?: boolean }) {
  const includeUpdates = options?.includeUpdates ?? true;
  const { readNotifications, hiddenNotifications, pendingUpdateInstalls } = useNotificationStorage({
    syncUpdateCandidates: includeUpdates,
  });
  const notificationData = useProviderNotificationData({ includeUpdates });
  const notifications = useNotificationList({
    ...notificationData,
    readNotifications,
    hiddenNotifications,
    pendingUpdateInstalls,
  });

  return useMemo(
    () => notifications.filter((notification) => !notification.read).length,
    [notifications]
  );
}
