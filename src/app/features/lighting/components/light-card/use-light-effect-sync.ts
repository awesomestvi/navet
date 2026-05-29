import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useI18n } from '@/app/hooks';
import type { PlatformEntitySnapshot } from '@/app/platform/provider-feature-models';
import {
  buildLightEffectOptions,
  normalizeCurrentLightEffect,
  supportsLightEffects,
  toHomeAssistantLightEffectValue,
} from './light-card-effect-utils';
import type { LightUpdateOptions } from './use-light-home-assistant-sync';

interface UseLightEffectSyncParams {
  supportsAdvancedLightControls: boolean;
  isOn: boolean;
  liveEntity: PlatformEntitySnapshot | undefined;
  setIsOn: React.Dispatch<React.SetStateAction<boolean>>;
  syncLight: (options: LightUpdateOptions) => Promise<void>;
}

export function useLightEffectSync({
  supportsAdvancedLightControls,
  isOn,
  liveEntity,
  setIsOn,
  syncLight,
}: UseLightEffectSyncParams) {
  const { t } = useI18n();
  const noEffectLabel = t('lighting.noEffect');
  const [currentEffect, setCurrentEffect] = useState<string | null>(() =>
    normalizeCurrentLightEffect(liveEntity?.attributes?.effect)
  );
  const pendingEffectRef = useRef<string | null>(null);
  const pendingEffectTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const nextEffect = normalizeCurrentLightEffect(liveEntity?.attributes?.effect);
    const pendingEffect = pendingEffectRef.current;

    if (pendingEffect !== null && nextEffect !== pendingEffect) {
      return;
    }

    if (pendingEffectTimeoutRef.current) {
      clearTimeout(pendingEffectTimeoutRef.current);
      pendingEffectTimeoutRef.current = null;
    }

    pendingEffectRef.current = null;
    setCurrentEffect(nextEffect);
  }, [liveEntity]);

  useEffect(
    () => () => {
      if (pendingEffectTimeoutRef.current) {
        clearTimeout(pendingEffectTimeoutRef.current);
      }
    },
    []
  );

  const effectOptions = useMemo(
    () => buildLightEffectOptions(liveEntity, noEffectLabel, currentEffect),
    [currentEffect, liveEntity, noEffectLabel]
  );
  const supportsEffects = supportsAdvancedLightControls && supportsLightEffects(liveEntity);

  const onEffectSelect = useCallback(
    (effectValue: string) => {
      if (!supportsEffects) {
        return;
      }

      const previousEffect = currentEffect;
      const nextEffect = normalizeCurrentLightEffect(effectValue);
      const nextHaEffect = toHomeAssistantLightEffectValue(effectValue);

      pendingEffectRef.current = nextEffect;
      setCurrentEffect(nextEffect);
      if (pendingEffectTimeoutRef.current) {
        clearTimeout(pendingEffectTimeoutRef.current);
      }
      pendingEffectTimeoutRef.current = setTimeout(() => {
        pendingEffectRef.current = null;
        pendingEffectTimeoutRef.current = null;
      }, 2500);

      if (!isOn) {
        setIsOn(true);
      }

      void syncLight({ state: 'on', effect: nextHaEffect }).catch(() => {
        if (pendingEffectTimeoutRef.current) {
          clearTimeout(pendingEffectTimeoutRef.current);
          pendingEffectTimeoutRef.current = null;
        }
        pendingEffectRef.current = null;
        setCurrentEffect(previousEffect);
        if (!isOn) {
          setIsOn(false);
        }
      });
    },
    [currentEffect, isOn, setIsOn, supportsEffects, syncLight]
  );

  return {
    currentEffect,
    effectOptions,
    onEffectSelect,
    supportsEffects,
  };
}
