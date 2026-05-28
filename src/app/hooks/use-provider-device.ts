import { useMemo } from 'react';
import type { NavetDevice } from '@/app/core/navet';
import { integrationSelectors } from '@/app/stores/selectors';
import { useIntegrationStore } from './use-integration-store';

export function useProviderDevice(deviceId: string): NavetDevice | null {
  const devicesByCanonicalId = useIntegrationStore(integrationSelectors.devicesByCanonicalId);

  return useMemo(() => devicesByCanonicalId[deviceId] ?? null, [deviceId, devicesByCanonicalId]);
}
