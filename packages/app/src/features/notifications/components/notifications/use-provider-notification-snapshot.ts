import { useIntegrationStore } from '@navet/app/hooks';
import { useHomeAssistant } from '@navet/app/hooks/use-home-assistant';
import type { PlatformNotificationSnapshot } from '@navet/app/platform/provider-feature-models';
import { getProviderRuntimeRegistration } from '@navet/app/provider-runtime-registry';
import { homeAssistantSelectors, integrationSelectors } from '@navet/app/stores/selectors';
import type { IntegrationProviderId } from '@navet/app/types/provider';
import { useEffect, useState } from 'react';

const EMPTY_NOTIFICATION_SNAPSHOT: PlatformNotificationSnapshot = {
  persistentNotifications: [],
  repairIssues: [],
};

export function useProviderNotificationSnapshot(): PlatformNotificationSnapshot {
  const selected = useIntegrationStore(integrationSelectors.selectedProviderIds);
  const health = useIntegrationStore(integrationSelectors.providerHealth);
  const connection = useHomeAssistant(homeAssistantSelectors.connection);
  const key = selected.filter((id) => health[id]?.connected).join(',');
  const [snapshot, setSnapshot] = useState(EMPTY_NOTIFICATION_SNAPSHOT);
  useEffect(() => {
    let cancelled = false;
    const snapshots = new Map<IntegrationProviderId, PlatformNotificationSnapshot>();
    const cleanups: (() => void)[] = [];
    setSnapshot(EMPTY_NOTIFICATION_SNAPSHOT);
    const publish = () => {
      if (cancelled) return;
      setSnapshot({
        persistentNotifications: [...snapshots.values()].flatMap(
          (value) => value.persistentNotifications
        ),
        repairIssues: [...snapshots.values()].flatMap((value) => value.repairIssues),
      });
    };
    for (const id of key.split(',').filter(Boolean) as IntegrationProviderId[]) {
      const service = getProviderRuntimeRegistration(id).notificationFeatureService;
      if (!service) continue;
      const options = id === 'home_assistant' ? { messageClient: connection } : undefined;
      void service
        .getSnapshot(options)
        .then((value) => {
          if (!cancelled) {
            snapshots.set(id, value);
            publish();
          }
        })
        .catch(() => undefined);
      void service
        .subscribePersistentNotifications((event) => {
          if (cancelled || !event.notifications) return;
          snapshots.set(id, {
            persistentNotifications: event.notifications,
            repairIssues: snapshots.get(id)?.repairIssues ?? [],
          });
          publish();
        }, options)
        .then((cleanup) => {
          if (cancelled) cleanup();
          else cleanups.push(cleanup);
        })
        .catch(() => undefined);
    }
    return () => {
      cancelled = true;
      cleanups.forEach((cleanup) => cleanup());
    };
  }, [key, connection]);
  return snapshot;
}
