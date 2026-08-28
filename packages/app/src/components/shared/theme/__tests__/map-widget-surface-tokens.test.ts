import { describe, expect, it } from 'vitest';
import { getMapWidgetSurfaceTokens } from '../map-widget-surface-tokens';

describe('getMapWidgetSurfaceTokens', () => {
  it.each(['light', 'glass', 'black', 'dark'] as const)(
    'keeps %s map tiles fully opaque',
    (theme) => {
      expect(getMapWidgetSurfaceTokens(theme).tileOpacity).toBe('1');
    }
  );

  it.each(['glass', 'black', 'dark'] as const)(
    'lifts roads and labels for the %s map without a white overlay',
    (theme) => {
      const tokens = getMapWidgetSurfaceTokens(theme);

      expect(tokens.tileFilter).toContain('contrast(1.');
      expect(tokens.tileFilter).toMatch(/brightness\(1\.\d+\)/);
      expect(tokens).not.toHaveProperty('lightOverlayBg');
    }
  );
});
