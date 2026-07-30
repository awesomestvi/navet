import { defaultSettings, type EffectsQuality } from '@navet/app/stores/settings-store';

export function resolveEffectsQuality(
  effectsQuality: EffectsQuality | undefined,
  reducedEffectsEnabled: boolean
): EffectsQuality {
  if (
    reducedEffectsEnabled &&
    (!effectsQuality || effectsQuality === defaultSettings.effectsQuality)
  ) {
    return 'low';
  }

  if (effectsQuality) {
    return effectsQuality;
  }

  return reducedEffectsEnabled ? 'low' : defaultSettings.effectsQuality;
}

export function getLegacyReducedEffectsFlags(effectsQuality: EffectsQuality) {
  return {
    disableAnimations: effectsQuality === 'low',
    lowPowerMode: effectsQuality === 'low',
  };
}

const EFFECTS_QUALITY_RANK: Record<EffectsQuality, number> = {
  low: 0,
  medium: 1,
  high: 2,
};

export function getLowestEffectsQuality(...qualities: readonly EffectsQuality[]): EffectsQuality {
  return qualities.reduce<EffectsQuality>(
    (lowest, quality) =>
      EFFECTS_QUALITY_RANK[quality] < EFFECTS_QUALITY_RANK[lowest] ? quality : lowest,
    'high'
  );
}
