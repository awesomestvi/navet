import type { NavetLightState } from '@navet/app/core/navet-device-state';
import { useLightMemoryStore } from '@navet/app/features/lighting/stores/light-memory-store';
import { useHaCommandQueue } from '@navet/app/hooks';
import type { PlatformEntitySnapshot } from '@navet/app/platform/provider-feature-models';
import { useCallback, useLayoutEffect, useRef, useState } from 'react';
import { clampPercentage, getBrightnessPercent } from './light-card-utils';
import { usePendingLightValue } from './use-pending-light-value';

type SyncLightOptions = {
  state?: 'on' | 'off';
  brightnessPct?: number;
};

interface UseLightBrightnessSyncParams {
  id: string;
  isOn: boolean;
  setIsOn: (on: boolean) => void;
  initialBrightness: number;
  liveEntity: PlatformEntitySnapshot | undefined;
  providerState: NavetLightState | null | undefined;
  syncLight: (options: SyncLightOptions) => Promise<void>;
  rememberLightState: (id: string, state: { brightness?: number }) => void;
  pendingOnStateRef: React.MutableRefObject<boolean | null>;
}

export function useLightBrightnessSync({
  id,
  isOn,
  setIsOn,
  initialBrightness,
  liveEntity,
  providerState,
  syncLight,
  rememberLightState,
  pendingOnStateRef,
}: UseLightBrightnessSyncParams) {
  const rememberedState = useLightMemoryStore.getState().getRememberedState(id);
  const [brightness, setBrightness] = useState(initialBrightness);
  const [isAdjustingBrightness, setIsAdjustingBrightness] = useState(false);
  const lastBrightnessRef = useRef(
    rememberedState?.brightness ?? (initialBrightness > 0 ? initialBrightness : 100)
  );
  const pendingBrightness = usePendingLightValue(1);

  // Normalize the observation before applying optimistic acknowledgement rules.
  useLayoutEffect(() => {
    if (isAdjustingBrightness) return;
    const observedState = liveEntity?.state ?? providerState?.value;
    if (
      pendingOnStateRef.current !== null &&
      observedState &&
      (observedState === 'on') !== pendingOnStateRef.current
    )
      return;
    const observedBrightness = liveEntity
      ? getBrightnessPercent(liveEntity)
      : typeof providerState?.brightnessPct === 'number'
        ? providerState.brightnessPct
        : initialBrightness;
    if (observedState === 'on' && !pendingBrightness.accept(observedBrightness)) return;
    if (observedBrightness > 0) {
      lastBrightnessRef.current = observedBrightness;
      rememberLightState(id, { brightness: observedBrightness });
    }
    const observedOff = liveEntity ? observedState !== 'on' : observedState === 'off';
    setBrightness(observedOff ? 0 : observedBrightness);
  }, [
    id,
    initialBrightness,
    isAdjustingBrightness,
    liveEntity,
    pendingBrightness,
    pendingOnStateRef,
    providerState?.brightnessPct,
    providerState?.value,
    rememberLightState,
  ]);

  useLayoutEffect(() => {
    if (isAdjustingBrightness) {
      return;
    }

    if (!isOn) {
      setBrightness((currentBrightness) => {
        if (currentBrightness > 0) {
          lastBrightnessRef.current = currentBrightness;
          rememberLightState(id, { brightness: currentBrightness });
        }

        return 0;
      });
      return;
    }

    setBrightness((currentBrightness) => {
      if (currentBrightness > 0) {
        return currentBrightness;
      }

      const latestRememberedState = useLightMemoryStore.getState().getRememberedState(id);
      const restoredBrightness =
        latestRememberedState?.brightness ?? (initialBrightness > 0 ? initialBrightness : 100);
      const nextBrightness = clampPercentage(restoredBrightness, 1);
      lastBrightnessRef.current = nextBrightness;
      return nextBrightness;
    });
  }, [id, initialBrightness, isAdjustingBrightness, isOn, rememberLightState]);

  const { queue: queueBrightnessSync } = useHaCommandQueue((pct: number) =>
    syncLight({ state: 'on', brightnessPct: pct })
  );

  const onBrightnessChange = useCallback(
    (value: number) => {
      const nextBrightness = clampPercentage(value, 1);
      setIsAdjustingBrightness(true);
      setBrightness(nextBrightness);
      lastBrightnessRef.current = nextBrightness;
      rememberLightState(id, { brightness: nextBrightness });
      if (!isOn) {
        setIsOn(true);
        void syncLight({ state: 'on', brightnessPct: nextBrightness }).catch(() => setIsOn(false));
        return;
      }
      queueBrightnessSync(nextBrightness);
    },
    [id, isOn, queueBrightnessSync, rememberLightState, setIsOn, syncLight]
  );

  const onBrightnessCommit = useCallback(
    (value: number) => {
      const nextBrightness = clampPercentage(value, 1);
      setBrightness(nextBrightness);
      lastBrightnessRef.current = nextBrightness;
      rememberLightState(id, { brightness: nextBrightness });
      setIsAdjustingBrightness(false);
      pendingBrightness.expect(nextBrightness);
      if (!isOn) setIsOn(true);
      queueBrightnessSync(nextBrightness, true);
    },
    [id, isOn, pendingBrightness, queueBrightnessSync, rememberLightState, setIsOn]
  );

  return {
    brightness,
    isAdjustingBrightness,
    lastBrightnessRef,
    expectBrightness: pendingBrightness.expect,
    onBrightnessChange,
    onBrightnessCommit,
  };
}
