import { describe, expect, it } from 'vitest';
import { getLightCardSurfaceTokens } from './light-card-surface-tokens';

describe('getLightCardSurfaceTokens', () => {
  it('keeps a solid selected-color surface in glass theme without extra brightening overlays', () => {
    const result = getLightCardSurfaceTokens({
      isOn: true,
      isColorMode: true,
      selectedColor: '#ff8800',
      customColor: '#ff8800',
      currentColor: '#ff8800',
      theme: 'glass',
      accentColor: '#f97316',
    });

    expect(result.cardStyle).toMatchObject({
      borderColor: '#ff880033',
    });
    expect(result.cardStyle?.background).toContain('linear-gradient(135deg, #ff8800 0%');
    expect(result.activeGlowClassName).toBeNull();
    expect(result.innerOverlayClassName).toBeNull();
    expect(result.shineOverlayClassName).toBeNull();
  });

  it('does not add the glass sheen overlay for non-selected glass light surfaces', () => {
    const result = getLightCardSurfaceTokens({
      isOn: true,
      selectedColor: null,
      currentColor: null,
      theme: 'glass',
      lightColors: {
        gradient: 'from-orange-800/80 to-orange-900/90',
        border: 'border-orange-600/25',
        iconBg: 'bg-orange-400/15',
        glow: 'transparent',
      },
      accentColor: '#f97316',
    });

    expect(result.shineOverlayClassName).toBeNull();
  });
});
