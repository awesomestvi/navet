import { describe, expect, it } from 'vitest';
import { generateLightTheme } from './generate-domain-themes';

describe('generateLightTheme', () => {
  it('uses the stronger solid accent surface for glass theme', () => {
    expect(generateLightTheme('glass', 'orange')).toMatchObject({
      gradient: 'from-orange-800/80 to-orange-900/90',
      border: 'border-orange-600/25',
      iconBg: 'bg-orange-400/15',
      accent: 'text-orange-400',
      glow: 'transparent',
    });
  });
});
