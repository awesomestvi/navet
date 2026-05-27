import { useMemo, useSyncExternalStore } from 'react';
import { useAuthSession } from '@/auth/AuthProvider';
import { homeyService } from '../services/homey.service';
import { integrationSelectors } from '../stores/selectors';
import { useCurrentIntegrationStore } from './use-home-assistant';

export interface CurrentIntegrationConnectionState {
  connected: boolean;
  connecting: boolean;
  reconnecting: boolean;
}

export function useCurrentIntegrationConnectionState(): CurrentIntegrationConnectionState {
  const { providerId } = useAuthSession();
  const homeAssistantConnection = useCurrentIntegrationStore((state) => ({
    connected: integrationSelectors.connected(state),
    connecting: integrationSelectors.connecting(state),
    reconnecting: integrationSelectors.reconnecting(state),
  }));
  const homeySnapshot = useSyncExternalStore(
    (listener) => homeyService.subscribe(listener),
    () => homeyService.getSnapshot()
  );

  return useMemo(() => {
    if (providerId === 'homey') {
      return {
        connected: homeySnapshot.connected,
        connecting: false,
        reconnecting: false,
      };
    }

    return homeAssistantConnection;
  }, [providerId, homeAssistantConnection, homeySnapshot.connected]);
}
