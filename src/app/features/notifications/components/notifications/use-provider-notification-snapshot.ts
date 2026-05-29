import { useIntegrationStore, useProviderHealth } from '@/app/hooks';
import type { PlatformNotificationSnapshot } from '@/app/platform/provider-feature-models';
import { integrationSelectors } from '@/app/stores/selectors';
import { useHaNotificationData } from './use-ha-notification-data';

const EMPTY_NOTIFICATION_SNAPSHOT: PlatformNotificationSnapshot = {
  persistentNotifications: [],
  repairIssues: [],
};

export function useProviderNotificationSnapshot(): PlatformNotificationSnapshot {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const providerHealth = useProviderHealth(currentProviderId);
  const canLoadNotifications = currentProviderId === 'home_assistant' && providerHealth.connected;
  const homeAssistantSnapshot = useHaNotificationData(canLoadNotifications);

  if (!canLoadNotifications) {
    return EMPTY_NOTIFICATION_SNAPSHOT;
  }

  return homeAssistantSnapshot;
}
