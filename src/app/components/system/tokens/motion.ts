import type { EffectsQuality } from '@/app/stores/settings-store';

export type NavetMotionProfileName = 'lowPower' | 'balanced' | 'premium';

export const navetMotionTokens = {
  durationsMs: {
    instant: 0,
    fast: 120,
    normal: 200,
    slow: 300,
    slower: 450,
  },
  profiles: {
    lowPower: {
      effectsQuality: 'low' as const,
      durationFastMs: 90,
      durationNormalMs: 140,
      durationSlowMs: 200,
      blur: false,
      parallax: false,
      heavyShadow: false,
      animatedGradients: false,
    },
    balanced: {
      effectsQuality: 'medium' as const,
      durationFastMs: 120,
      durationNormalMs: 200,
      durationSlowMs: 300,
      blur: true,
      parallax: false,
      heavyShadow: false,
      animatedGradients: false,
    },
    premium: {
      effectsQuality: 'high' as const,
      durationFastMs: 120,
      durationNormalMs: 220,
      durationSlowMs: 360,
      blur: true,
      parallax: true,
      heavyShadow: true,
      animatedGradients: true,
    },
  },
} as const;

export function getNavetMotionProfileName(effectsQuality: EffectsQuality): NavetMotionProfileName {
  if (effectsQuality === 'low') {
    return 'lowPower';
  }

  if (effectsQuality === 'medium') {
    return 'balanced';
  }

  return 'premium';
}

export function getNavetMotionProfile(effectsQuality: EffectsQuality) {
  return navetMotionTokens.profiles[getNavetMotionProfileName(effectsQuality)];
}
