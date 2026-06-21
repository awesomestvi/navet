import { describe, expect, it } from 'vitest';
import { getSecurityCardSurfaceTokens } from '../security-card-surface-tokens';

describe('getSecurityCardSurfaceTokens', () => {
  it('keeps light-theme lock surfaces on solid controls instead of glassy translucency', () => {
    const surface = getSecurityCardSurfaceTokens('light');

    expect(surface.lockButtonBg).toBe('bg-white');
    expect(surface.lockCardOverlay).not.toContain('bg-white/22');
    expect(surface.lockCardOverlay).toContain('linear-gradient');
    expect(surface.sliderTrackClassName).toContain('bg-slate-100/95');
    expect(surface.lockSliderFillBg).toBe('bg-white/88');
  });
});
