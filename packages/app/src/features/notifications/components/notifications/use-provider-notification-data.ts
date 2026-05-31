import { useIntegrationStore, useProviderFeature } from '@navet/app/hooks';
import type {
  PlatformNotificationSnapshot,
  PlatformUpdateNotificationCandidate,
} from '@navet/app/platform/provider-feature-models';
import { integrationSelectors } from '@navet/app/stores/selectors';
import { useProviderNotificationSnapshot } from './use-provider-notification-snapshot';
import { useProviderUpdateCandidates } from './use-provider-update-candidates';

export interface ProviderNotificationData extends PlatformNotificationSnapshot {
  entitiesHydrated: boolean;
  updateCandidates: PlatformUpdateNotificationCandidate[];
}

const EMPTY_NOTIFICATION_DATA: ProviderNotificationData = {
  entitiesHydrated: false,
  persistentNotifications: [],
  repairIssues: [],
  updateCandidates: [],
};

export function useProviderNotificationData(options?: {
  includeUpdates?: boolean;
}): ProviderNotificationData {
  const supportsNotifications = useProviderFeature('notifications');
  const currentProviderRuntime = useIntegrationStore(integrationSelectors.currentProviderRuntime);
  const notificationSnapshot = useProviderNotificationSnapshot();
  const updateCandidates = useProviderUpdateCandidates(options?.includeUpdates ?? true);
  const entitiesHydrated = currentProviderRuntime.entitiesHydrated;

  if (!supportsNotifications) {
    return EMPTY_NOTIFICATION_DATA;
  }

  return {
    ...notificationSnapshot,
    entitiesHydrated,
    updateCandidates,
  };
}
