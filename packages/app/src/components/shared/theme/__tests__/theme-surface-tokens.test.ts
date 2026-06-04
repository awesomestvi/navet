import { describe, expect, it } from 'vitest';
import { getThemeSurfaceTokens } from '../theme-surface-tokens';

describe('getThemeSurfaceTokens', () => {
  it('does not include a light overlay in glass theme', () => {
    expect(getThemeSurfaceTokens('glass').lightOverlay).toBeNull();
  });
});
