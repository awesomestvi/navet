import { describe, expect, it } from 'vitest';
import { getCardReadableTextTokens } from '../card-readable-text-tokens';

function channelToLinear(channel: number) {
  const normalized = channel / 255;
  return normalized <= 0.04045 ? normalized / 12.92 : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getLuminance(color: string) {
  const normalized = color.replace('#', '');
  const red = Number.parseInt(normalized.slice(0, 2), 16);
  const green = Number.parseInt(normalized.slice(2, 4), 16);
  const blue = Number.parseInt(normalized.slice(4, 6), 16);

  return (
    0.2126 * channelToLinear(red) + 0.7152 * channelToLinear(green) + 0.0722 * channelToLinear(blue)
  );
}

function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getLuminance(foreground);
  const backgroundLuminance = getLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);

  return (lighter + 0.05) / (darker + 0.05);
}

describe('getCardReadableTextTokens', () => {
  it('keeps rgb artwork palettes readable on light surfaces', () => {
    const tokens = getCardReadableTextTokens({
      theme: 'light',
      baseColor: 'rgb(248, 250, 252)',
      backgroundColor: 'rgb(232, 232, 232)',
    });

    expect(tokens.titleColor).not.toBe('#ffffff');
    expect(getContrastRatio(tokens.titleColor, '#e8e8e8')).toBeGreaterThanOrEqual(4.5);
    expect(getContrastRatio(tokens.subtitleColor, '#e8e8e8')).toBeGreaterThanOrEqual(4.5);
  });
});
