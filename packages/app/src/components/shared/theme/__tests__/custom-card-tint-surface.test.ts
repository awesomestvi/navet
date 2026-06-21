import { describe, expect, it } from 'vitest';
import { getCustomCardTintSurface } from '../custom-card-tint-surface';

describe('getCustomCardTintSurface', () => {
  it('returns a darker color-driven surface in dark theme instead of a translucent tint wash', () => {
    const tokens = getCustomCardTintSurface('dark', '#60a5fa');

    expect(tokens.panelStyle?.background).toContain('linear-gradient');
    expect(tokens.panelStyle?.background).not.toContain('rgba(39,39,42,0.94)');
    expect(tokens.textPrimaryColor).toBeDefined();
    expect(tokens.textSecondaryColor).toBeDefined();
  });

  it('exposes tint-aware readable text colors when a custom tint is applied', () => {
    const tokens = getCustomCardTintSurface('dark', '#60a5fa');

    expect(tokens.textPrimaryColor).toBeDefined();
    expect(tokens.textSecondaryColor).toBeDefined();
    expect(tokens.textPrimaryColor).not.toBe('#ffffff');
  });

  it('keeps light-theme tinted cards on dark readable text instead of white text', () => {
    const tokens = getCustomCardTintSurface('light', '#f97316');

    expect(tokens.textPrimaryColor).toBeDefined();
    expect(tokens.textSecondaryColor).toBeDefined();
    expect(tokens.textPrimaryColor).not.toBe('#ffffff');
  });

  it('keeps orange custom tints in the orange family for dark surfaces', () => {
    const tokens = getCustomCardTintSurface('dark', '#f97316');

    expect(tokens.panelStyle?.background).toContain('rgb(161, 68, 4)');
    expect(tokens.panelStyle?.background).toContain('rgb(130, 55, 3)');
    expect(tokens.panelStyle?.background).not.toContain('rgb(149, 15, 0)');
  });
});
