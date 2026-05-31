import type { NavetLightState } from '@navet/app/core/navet-device-state';
import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import { useEffect } from 'react';

interface UseLightOnStateSyncParams {
  initialState: boolean;
  liveEntity: PlatformEntitySnapshot | undefined;
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
