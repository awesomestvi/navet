import { useMemo } from 'react';
import type { NavetDevice } from '@/app/core/navet';
import { integrationSelectors } from '@/app/stores/selectors';
import { isLegacyHomeAssistantEntityId } from '@/app/utils/provider-entity-id';
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

    return (
      devicesByCanonicalId[createProviderScopedId(currentProviderId, deviceId)] ??
      (isLegacyHomeAssistantEntityId(deviceId)
        ? (devicesByCanonicalId[createProviderScopedId('home_assistant', deviceId)] ?? null)
        : null)
    );
  }, [currentProviderId, deviceId, devicesByCanonicalId]);
}
