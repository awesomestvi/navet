import type { NavetEntity } from '@navet/core/types';
import { useMemo } from 'react';
import { integrationSelectors } from '@/app/stores/selectors';
import type { IntegrationProviderId } from '@/app/types/provider';
import { createProviderScopedId, parseProviderScopedId } from '@/app/utils/provider-ids';
import { useIntegrationStore } from './use-integration-store';

function resolveProviderRecordEntry<
  T extends { nativeId?: string; externalId?: string; canonicalId: string },
>(
  recordByCanonicalId: Record<string, T>,
  deviceId: string,
  currentProviderId: IntegrationProviderId
): T | null {
  const directMatch = recordByCanonicalId[deviceId];
  if (directMatch) {
    return directMatch;
  }

  const scopedId = parseProviderScopedId(deviceId);
  if (scopedId) {
    return (
      recordByCanonicalId[createProviderScopedId(scopedId.providerId, scopedId.nativeId)] ?? null
    );
  }

  const currentProviderMatch =
    recordByCanonicalId[createProviderScopedId(currentProviderId, deviceId)];
  if (currentProviderMatch) {
    return currentProviderMatch;
  }

  return (
    Object.values(recordByCanonicalId).find((entry) => {
      const nativeId = 'nativeId' in entry ? entry.nativeId : entry.externalId;
      return nativeId === deviceId || entry.canonicalId === deviceId;
    }) ?? null
  );
}

export function useProviderEntityModel(entityId: string): NavetEntity | null {
  const currentProviderId = useIntegrationStore(integrationSelectors.currentProviderId);
  const entitiesByCanonicalId = useIntegrationStore(
    integrationSelectors.providerEntitiesByCanonicalId
  );

  return useMemo(() => {
    return resolveProviderRecordEntry(entitiesByCanonicalId, entityId, currentProviderId);
  }, [currentProviderId, entitiesByCanonicalId, entityId]);
}
