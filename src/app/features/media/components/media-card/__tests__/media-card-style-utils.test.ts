import { describe, expect, it } from 'vitest';
import {
  clampMediaPercent,
  getMediaDisplayVolume,
  getMediaProgressPercent,
} from '../../media/media-card-style-utils';
import { withAlpha } from '../../media/use-media-artwork-colors';

describe('media card style utils', () => {
  it('clamps percentage values to the media control range', () => {
    expect(clampMediaPercent(-10)).toBe(0);
    expect(clampMediaPercent(42)).toBe(42);
    expect(clampMediaPercent(120)).toBe(100);
  });

  it('resolves muted display volume as zero', () => {
    expect(getMediaDisplayVolume(80, true)).toBe(0);
    expect(getMediaDisplayVolume(120, false)).toBe(100);
  });

  it('guards progress calculations against empty durations', () => {
    expect(getMediaProgressPercent(30, 0)).toBe(0);
    expect(getMediaProgressPercent(30, 60)).toBe(50);
    expect(getMediaProgressPercent(90, 60)).toBe(100);
  });

  it('applies alpha to hex readable text colors', () => {
    expect(withAlpha('#0f172a', 0.24)).toBe('rgba(15, 23, 42, 0.24)');
    expect(withAlpha('#fff', 0.4)).toBe('rgba(255, 255, 255, 0.4)');
  });
});
