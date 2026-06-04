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

  it('keeps black-theme active light cards flatter without glow sheen overlays', () => {
    const tokens = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: null,
      currentColor: '',
      theme: 'black',
      accentColor: '#f97316',
    });

    expect(tokens.cardStyle).toBeUndefined();
    expect(tokens.cardClassName).toContain('from-orange-900/40');
    expect(tokens.cardClassName).toContain('to-orange-950/40');
    expect(tokens.cardClassName).toContain('border-orange-500/20');
    expect(tokens.activeGlowClassName).toBeNull();
    expect(tokens.shineOverlayClassName).toBeNull();
    expect(tokens.innerOverlayClassName).toBe('absolute inset-0');
    expect(tokens.innerOverlayStyle).toEqual({
      background:
        'linear-gradient(180deg, rgba(255,255,255,0.012) 0%, rgba(255,255,255,0.004) 16%, rgba(0,0,0,0.1) 100%)',
    });
  });

  it('uses the selected light color for black-theme borders without restoring the glass sheen', () => {
    const tokens = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: '#dc2626',
      currentColor: '#dc2626',
      theme: 'black',
      accentColor: '#f97316',
    });

    expect(tokens.cardStyle).toMatchObject({
      backgroundColor: 'rgb(45, 0, 0)',
      borderColor: 'rgba(220, 38, 38, 0.28)',
    });
    expect(tokens.cardStyle?.background).toContain('rgba(220, 38, 38, 0.18)');
    expect(tokens.cardStyle?.background).toContain('rgba(220, 38, 38, 0.3)');
    expect(tokens.activeGlowClassName).toBeNull();
    expect(tokens.shineOverlayClassName).toBeNull();
  });

  it('gives light-theme active cards a stronger tinted surface without the old white wash', () => {
    const tokens = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: null,
      currentColor: '',
      theme: 'light',
      accentColor: '#f97316',
    });

    expect(tokens.cardStyle).toMatchObject({
      background: '#f97316',
      borderColor: '#f97316',
    });
    expect(tokens.cardStyle?.backgroundColor).toBeUndefined();
    expect(tokens.cardStyle?.boxShadow).toBeUndefined();
    expect(tokens.innerOverlayClassName).toBeNull();
    expect(tokens.innerOverlayStyle).toBeUndefined();
  });
});
