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
  useLayoutEffect(() => {
    const hasObservedState =
      liveEntity || providerState?.value === 'on' || providerState?.value === 'off';
    if (!hasObservedState) {
      setIsOn(initialState);
      return;
    }
    const nextIsOn = (liveEntity?.state ?? providerState?.value) === 'on';
    const pendingOnState = pendingOnStateRef.current;
    if (pendingOnState !== null && pendingOnState !== nextIsOn) return;
    if (pendingOnState !== null) {
      pendingOnStateRef.current = null;
      if (pendingOnStateTimeoutRef.current) {
        clearTimeout(pendingOnStateTimeoutRef.current);
        pendingOnStateTimeoutRef.current = null;
      }
    }
    setIsOn(nextIsOn);
  }, [
    initialState,
    liveEntity,
    pendingOnStateRef,
    pendingOnStateTimeoutRef,
    providerState?.value,
    setIsOn,
  ]);
}
