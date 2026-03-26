import { type Dispatch, type SetStateAction, useEffect } from 'react';

interface UseDashboardDevicesLoadedParams {
  connected: boolean;
  connecting: boolean;
  setDevicesLoaded: Dispatch<SetStateAction<boolean>>;
}

export function useDashboardDevicesLoaded({
  connected,
  connecting,
  setDevicesLoaded,
}: UseDashboardDevicesLoadedParams) {
  useEffect(() => {
    if (connected || !connecting) {
      setDevicesLoaded(true);
    }
  }, [connected, connecting, setDevicesLoaded]);
}
