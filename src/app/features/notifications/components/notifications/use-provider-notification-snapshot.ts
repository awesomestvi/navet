import { useIntegrationStore } from '@/app/hooks';
import type { PlatformNotificationSnapshot } from '@/app/platform/provider-feature-models';
import { integrationSelectors } from '@/app/stores/selectors';
import { useHaNotificationData } from './use-ha-notification-data';

const EMPTY_NOTIFICATION_SNAPSHOT: PlatformNotificationSnapshot = {
  persistentNotifications: [],
  repairIssues: [],
};

export function useProviderNotificationSnapshot(): PlatformNotificationSnapshot {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const isHomeAssistantProvider = currentProviderId === 'home_assistant';
  const homeAssistantSnapshot = useHaNotificationData(isHomeAssistantProvider);

  if (!isHomeAssistantProvider) {
    return EMPTY_NOTIFICATION_SNAPSHOT;
  }

  return homeAssistantSnapshot;
}
