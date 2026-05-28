import { useMemo } from 'react';
import { useAuthSession } from '@/auth/AuthProvider';
import { useProviderHealth } from './use-provider-health';

export interface CurrentIntegrationConnectionState {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
}

export function useCurrentIntegrationConnectionState(): CurrentIntegrationConnectionState {
  const { providerId } = useAuthSession();
  const providerHealth = useProviderHealth(providerId);

  return useMemo(() => {
    return {
      connected: providerHealth.connected,
      connecting: providerHealth.connecting,
      reconnecting: providerHealth.reconnecting,
    };
  }, [providerHealth]);
}
