import { useMemo } from 'react';
import type { NavetDevice } from '@/app/core/navet';
import { integrationSelectors } from '@/app/stores/selectors';
import { createProviderScopedId, parseProviderScopedId } from '@/app/utils/provider-ids';
import { useIntegrationStore } from './use-integration-store';

export function useProviderDevice(deviceId: string): NavetDevice | null {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const devicesByCanonicalId = useIntegrationStore(integrationSelectors.devicesByCanonicalId);

  return useMemo(() => {
    const directMatch = devicesByCanonicalId[deviceId];
    if (directMatch) {
      return directMatch;
    }

    const scopedId = parseProviderScopedId(deviceId);
    if (scopedId) {
      return (
        devicesByCanonicalId[createProviderScopedId(scopedId.providerId, scopedId.nativeId)] ?? null
      );
    }

    const currentProviderMatch =
      devicesByCanonicalId[createProviderScopedId(currentProviderId, deviceId)];
    if (currentProviderMatch) {
      return currentProviderMatch;
    }

    return (
      Object.values(devicesByCanonicalId).find(
        (device) => device.nativeId === deviceId || device.canonicalId === deviceId
      ) ?? null
    );
  }, [currentProviderId, deviceId, devicesByCanonicalId]);
}
