import { describe, expect, it } from 'vitest';
import {
  capEffectsQualityToDeviceTier,
  resolveMeasuredEffectsQuality,
} from '../use-adaptive-effects-quality';

describe('adaptive effects quality', () => {
  it('keeps high quality for consistently delivered frames', () => {
    expect(resolveMeasuredEffectsQuality(Array.from({ length: 90 }, () => 16.7))).toBe('high');
  });

  it('selects medium when a small share of frames miss the 20 ms budget', () => {
    const frames = Array.from({ length: 90 }, (_, index) => (index < 6 ? 22 : 16.7));
    expect(resolveMeasuredEffectsQuality(frames)).toBe('medium');
  });

  it('selects low when sustained frames exceed the smooth-interaction budget', () => {
    expect(resolveMeasuredEffectsQuality(Array.from({ length: 90 }, () => 34))).toBe('low');
  });

  it('never upgrades beyond the detected hardware tier', () => {
    expect(capEffectsQualityToDeviceTier('high', 'medium')).toBe('medium');
    expect(capEffectsQualityToDeviceTier('medium', 'low')).toBe('low');
  });
});
