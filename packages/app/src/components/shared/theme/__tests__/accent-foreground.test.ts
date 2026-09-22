import {
  getReadableAccentForeground,
  themeColorValues,
} from '@navet/app/components/shared/theme/theme-colors';
import { describe, expect, it } from 'vitest';

function luminance(color: string) {
  const channels = [1, 3, 5].map((index) => Number.parseInt(color.slice(index, index + 2), 16));
  const [red, green, blue] = channels.map((channel) => {
    const value = channel / 255;
    return value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * red + 0.7152 * green + 0.0722 * blue;
}

function contrastRatio(first: string, second: string) {
  const [lighter, darker] = [luminance(first), luminance(second)].sort((a, b) => b - a);
  return (lighter + 0.05) / (darker + 0.05);
}

describe('accent foreground', () => {
  it('meets normal-text contrast for every preset and light and dark custom accents', () => {
    for (const accent of [...Object.values(themeColorValues), '#fffffe', '#020304']) {
      expect(contrastRatio(accent, getReadableAccentForeground(accent))).toBeGreaterThanOrEqual(
        4.5
      );
    }
  });

  it('uses dark text on the default orange accent', () => {
    expect(getReadableAccentForeground(themeColorValues.orange)).toBe('#000000');
  });
});
