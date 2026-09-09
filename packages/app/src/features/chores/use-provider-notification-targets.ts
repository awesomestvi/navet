import type { PlatformNotificationDeliveryTarget } from '@navet/app/platform/provider-feature-models';
import { integrationNotificationFeatureService } from '@navet/app/services/integration-notification-feature.service';
import { useEffect, useState } from 'react';

type ProviderNotificationTargetsStatus = 'idle' | 'loading' | 'ready' | 'unavailable';

export function useProviderNotificationTargets(enabled: boolean) {
  const [targets, setTargets] = useState<PlatformNotificationDeliveryTarget[]>([]);
  const [status, setStatus] = useState<ProviderNotificationTargetsStatus>('idle');

  useEffect(() => {
    if (!enabled) {
      setTargets([]);
      setStatus('idle');
      return;
    }

    let active = true;
    setStatus('loading');
    const request = integrationNotificationFeatureService.getDeliveryTargets?.();
    if (!request) {
      setStatus('unavailable');
      return;
    }
    void request
      .then((nextTargets) => {
        if (!active) return;
        setTargets(nextTargets ?? []);
        setStatus('ready');
      })
      .catch(() => {
        if (!active) return;
        setTargets([]);
        setStatus('unavailable');
      });

    return () => {
      active = false;
    };
  }, [enabled]);

  return { targets, status };
}
