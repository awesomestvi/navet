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
