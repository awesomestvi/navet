import type { HassEntity } from 'home-assistant-js-websocket';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useHaCommandQueue } from '@/app/hooks';
import { useLightMemoryStore } from '../../stores/light-memory-store';
import { clampPercentage, getBrightnessPercent } from './light-card-utils';

type SyncLightOptions = {
  state?: 'on' | 'off';
  brightnessPct?: number;
};

interface UseLightBrightnessSyncParams {
  id: string;
  isOn: boolean;
  setIsOn: (on: boolean) => void;
  initialBrightness: number;
  liveEntity: HassEntity | undefined;
  syncLight: (options: SyncLightOptions) => Promise<void>;
  rememberLightState: (id: string, state: { brightness?: number }) => void;
}

export function useLightBrightnessSync({
  id,
  isOn,
  setIsOn,
  initialBrightness,
  liveEntity,
  syncLight,
  rememberLightState,
}: UseLightBrightnessSyncParams) {
  const rememberedState = useLightMemoryStore.getState().getRememberedState(id);
  const [brightness, setBrightness] = useState(initialBrightness);
  const [isAdjustingBrightness, setIsAdjustingBrightness] = useState(false);
  const lastBrightnessRef = useRef(
    rememberedState?.brightness ?? (initialBrightness > 0 ? initialBrightness : 100)
  );
  const pendingBrightnessRef = useRef<number | null>(null);
  const brightnessSyncTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (liveEntity) return;
    setBrightness(initialBrightness);
    if (initialBrightness > 0) {
      lastBrightnessRef.current = initialBrightness;
      rememberLightState(id, { brightness: initialBrightness });
    }
  }, [id, initialBrightness, liveEntity, rememberLightState]);

  useEffect(() => {
    if (!liveEntity || isAdjustingBrightness) return;
    const brightnessFromEntity = getBrightnessPercent(liveEntity);
    if (liveEntity.state !== 'on') {
      if (brightnessFromEntity > 0) {
        lastBrightnessRef.current = brightnessFromEntity;
        rememberLightState(id, { brightness: brightnessFromEntity });
      }
      return;
    }
    if (
      pendingBrightnessRef.current !== null &&
      Math.abs(brightnessFromEntity - pendingBrightnessRef.current) > 1
    ) {
      return;
    }
    if (pendingBrightnessRef.current !== null) {
      pendingBrightnessRef.current = null;
      if (brightnessSyncTimeoutRef.current) {
        clearTimeout(brightnessSyncTimeoutRef.current);
        brightnessSyncTimeoutRef.current = null;
      }
    }
    if (brightnessFromEntity > 0) {
      lastBrightnessRef.current = brightnessFromEntity;
      rememberLightState(id, { brightness: brightnessFromEntity });
    }
    setBrightness(brightnessFromEntity);
  }, [id, isAdjustingBrightness, liveEntity, rememberLightState]);

  useEffect(() => {
    return () => {
      if (brightnessSyncTimeoutRef.current) clearTimeout(brightnessSyncTimeoutRef.current);
    };
  }, []);

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
      pendingBrightnessRef.current = nextBrightness;
      if (brightnessSyncTimeoutRef.current) clearTimeout(brightnessSyncTimeoutRef.current);
      brightnessSyncTimeoutRef.current = setTimeout(() => {
        pendingBrightnessRef.current = null;
        brightnessSyncTimeoutRef.current = null;
      }, 1500);
      if (!isOn) setIsOn(true);
      queueBrightnessSync(nextBrightness, true);
    },
    [id, isOn, queueBrightnessSync, rememberLightState, setIsOn]
  );

  return {
    brightness,
    isAdjustingBrightness,
    lastBrightnessRef,
    pendingBrightnessRef,
    brightnessSyncTimeoutRef,
    onBrightnessChange,
    onBrightnessCommit,
  };
}
