import { describe, expect, it } from 'vitest';
import { getLightCardSurfaceTokens } from '../light-card-surface-tokens';

describe('getLightCardSurfaceTokens', () => {
  it('uses the active light color for content accents when a light color is selected', () => {
    const tokens = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: '#dc2626',
      theme: 'dark',
      accentColor: '#22c55e',
    });

    expect(tokens.contentAccentColor).toBe('#dc2626');
  });

  it('falls back to the theme accent when no light color is selected', () => {
    const tokens = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: null,
      theme: 'dark',
      accentColor: '#22c55e',
    });

    expect(tokens.contentAccentColor).toBe('#22c55e');
  });

  it('keeps the configured active light surface when no light color is selected', () => {
    const tokens = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: null,
      currentColor: '',
      theme: 'dark',
      accentColor: '#12abef',
      lightColors: {
        gradient: 'from-orange-900/90 to-orange-950/95',
        border: 'border-orange-700/30',
        iconBg: 'bg-orange-500/20',
        accent: 'text-orange-400',
        glow: 'from-orange-500/10',
      },
    });

    expect(tokens.cardStyle).toBeUndefined();
    expect(tokens.cardClassName).toContain('from-orange-900/90 to-orange-950/95');
    expect(tokens.cardClassName).toContain('border-orange-700/30');
    expect(tokens.contentAccentColor).toBe('#12abef');
  });

  it('does not treat the remembered custom swatch color as the active light color', () => {
    const tokens = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: null,
      currentColor: '',
      customColor: '#dc2626',
      theme: 'dark',
      accentColor: '#22c55e',
    });

    expect(tokens.contentAccentColor).toBe('#22c55e');
  });

  it('does not expose an active content accent while the light is off', () => {
    const tokens = getLightCardSurfaceTokens({
      isOn: false,
      selectedColor: '#dc2626',
      theme: 'dark',
      accentColor: '#22c55e',
    });

    expect(tokens.contentAccentColor).toBeNull();
  });
});
