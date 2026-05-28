import type { HassEntity } from 'home-assistant-js-websocket';
import { useEffect } from 'react';
import type { NavetLightState } from '@/app/core/navet-device-state';

interface UseLightOnStateSyncParams {
  initialState: boolean;
  liveEntity: HassEntity | undefined;
  providerState?: NavetLightState | null;
  setIsOn: React.Dispatch<React.SetStateAction<boolean>>;
}

export function useLightOnStateSync({
  initialState,
  liveEntity,
  providerState,
  setIsOn,
}: UseLightOnStateSyncParams) {
  useEffect(() => {
    if (liveEntity) return;
    if (providerState?.value === 'on' || providerState?.value === 'off') {
      setIsOn(providerState.value === 'on');
      return;
    }
    setIsOn(initialState);
  }, [initialState, liveEntity, providerState?.value, setIsOn]);

  useEffect(() => {
    if (!liveEntity) return;
    setIsOn(liveEntity.state === 'on');
  }, [liveEntity, setIsOn]);
}
