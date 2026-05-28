import { useProviderFeature } from '@/app/hooks';
import type { HaNotificationData as ProviderNotificationData } from './use-ha-notification-data';
import { useHaNotificationData } from './use-ha-notification-data';

const EMPTY_NOTIFICATION_DATA: ProviderNotificationData = {
  persistentNotifications: [],
  repairIssues: [],
};

export type { ProviderNotificationData };

export function useProviderNotificationData(): ProviderNotificationData {
  const supportsNotifications = useProviderFeature('notifications');
  const haData = useHaNotificationData();
  return supportsNotifications ? haData : EMPTY_NOTIFICATION_DATA;
}
