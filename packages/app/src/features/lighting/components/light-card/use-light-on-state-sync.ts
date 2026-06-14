import type { NavetLightState } from '@navet/app/core/navet-device-state';
import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import { useLayoutEffect } from 'react';

interface UseLightOnStateSyncParams {
  initialState: boolean;
  liveEntity: PlatformEntitySnapshot | undefined;
  providerState?: NavetLightState | null;
  setIsOn: React.Dispatch<React.SetStateAction<boolean>>;
  pendingOnStateRef: React.MutableRefObject<boolean | null>;
  pendingOnStateTimeoutRef: React.MutableRefObject<ReturnType<typeof setTimeout> | null>;
}

export function useLightOnStateSync({
  initialState,
  liveEntity,
  providerState,
  setIsOn,
  pendingOnStateRef,
  pendingOnStateTimeoutRef,
}: UseLightOnStateSyncParams) {
  const resolvePendingOnState = (nextIsOn: boolean) => {
    const pendingOnState = pendingOnStateRef.current;
    if (pendingOnState === null) {
      return true;
    }

    if (pendingOnState !== nextIsOn) {
      return false;
    }

    pendingOnStateRef.current = null;
    if (pendingOnStateTimeoutRef.current) {
      clearTimeout(pendingOnStateTimeoutRef.current);
      pendingOnStateTimeoutRef.current = null;
    }
    return true;
  };

  useLayoutEffect(() => {
    if (liveEntity) return;
    if (providerState?.value === 'on' || providerState?.value === 'off') {
      const nextIsOn = providerState.value === 'on';
      if (!resolvePendingOnState(nextIsOn)) {
        return;
      }
      setIsOn(nextIsOn);
      return;
    }
    setIsOn(initialState);
  }, [
    initialState,
    liveEntity,
    pendingOnStateRef,
    pendingOnStateTimeoutRef,
    providerState?.value,
    setIsOn,
  ]);

  useLayoutEffect(() => {
    if (!liveEntity) return;
    const nextIsOn = liveEntity.state === 'on';
    if (!resolvePendingOnState(nextIsOn)) {
      return;
    }
    setIsOn(nextIsOn);
  }, [liveEntity, pendingOnStateRef, pendingOnStateTimeoutRef, setIsOn]);
}
