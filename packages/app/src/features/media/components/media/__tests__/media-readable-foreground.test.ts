import { describe, expect, it } from 'vitest';
import { getMediaReadableForeground } from '../media-readable-foreground';

describe('getMediaReadableForeground', () => {
  const brightPalette = {
    dominant: 'rgb(198, 179, 156)',
    vibrant: 'rgb(206, 183, 148)',
    darkMuted: 'rgb(146, 127, 108)',
    highlight: 'rgb(237, 225, 208)',
    gradientEnd: 'rgb(190, 171, 150)',
  };
  const darkPalette = {
    dominant: 'rgb(41, 41, 43)',
    vibrant: 'rgb(88, 88, 94)',
    darkMuted: 'rgb(18, 18, 20)',
    highlight: 'rgb(210, 210, 214)',
    gradientEnd: 'rgb(30, 30, 32)',
  };
  const accentPalette = {
    dominant: 'rgb(202, 191, 170)',
    vibrant: 'rgb(148, 54, 40)',
    darkMuted: 'rgb(116, 98, 82)',
    highlight: 'rgb(235, 228, 214)',
    gradientEnd: 'rgb(188, 176, 160)',
  };

  it('switches to darker text for bright artwork outside glass theme', () => {
    const result = getMediaReadableForeground({
      theme: 'dark',
      palette: brightPalette,
      titleColor: '#ffffff',
      subtitleColor: '#d4d4d8',
      hasArtwork: true,
      backgroundColorOverride: 'rgb(236, 236, 236)',
    });

    expect(result.titleColor).toBe('rgb(116, 102, 88)');
    expect(result.subtitleColor).toBe('rgb(116, 102, 88)');
  });

  it('keeps light text for dark artwork even when the palette has a bright highlight swatch', () => {
    const result = getMediaReadableForeground({
      theme: 'dark',
      palette: darkPalette,
      titleColor: '#ffffff',
      subtitleColor: '#d4d4d8',
      hasArtwork: true,
    });

    expect(result.titleColor).toBe('#ffffff');
    expect(result.subtitleColor).toBe('#d4d4d8');
  });

  it('keeps the media text block on one foreground family for bright artwork', () => {
    const result = getMediaReadableForeground({
      theme: 'glass',
      palette: brightPalette,
      titleColor: '#ffffff',
      subtitleColor: '#d4d4d8',
      hasArtwork: true,
      backgroundColorOverride: 'rgb(210, 198, 184)',
    });

    expect(result.titleColor).toBe('rgb(77, 67, 58)');
    expect(result.subtitleColor).toBe('rgb(77, 67, 58)');
  });

  it('prefers a strong artwork accent family when it still clears contrast', () => {
    const result = getMediaReadableForeground({
      theme: 'glass',
      palette: accentPalette,
      titleColor: '#ffffff',
      subtitleColor: '#d4d4d8',
      hasArtwork: true,
      backgroundColorOverride: 'rgb(208, 196, 180)',
    });

    expect(result.titleColor).toMatch(/^rgb\(/);
    expect(result.subtitleColor).toMatch(/^rgb\(/);
    expect(result.titleColor).not.toBe('#1f2937');
    expect(result.subtitleColor).not.toBe('#334155');
    expect(result.titleColor).not.toBe('#ffffff');
    expect(result.subtitleColor).not.toBe('#d4d4d8');
  });

  it('keeps red-led artwork accents for bright surfaces instead of collapsing to slate neutrals', () => {
    const result = getMediaReadableForeground({
      theme: 'glass',
      palette: {
        dominant: 'rgb(202, 191, 170)',
        vibrant: 'rgb(122, 48, 36)',
        darkMuted: 'rgb(116, 98, 82)',
        highlight: 'rgb(235, 228, 214)',
        gradientEnd: 'rgb(188, 176, 160)',
      },
      titleColor: '#ffffff',
      subtitleColor: '#d4d4d8',
      hasArtwork: true,
      backgroundColorOverride: 'rgb(208, 196, 180)',
    });

    expect(result.titleColor).toMatch(/^rgb\(/);
    expect(result.subtitleColor).toMatch(/^rgb\(/);
    expect(result.titleColor).not.toBe('#1f2937');
    expect(result.titleColor).not.toBe('#111827');
    expect(result.subtitleColor).not.toBe('#334155');
    expect(result.titleColor).toMatch(/^rgb\(1[0-3][0-9], [3-7][0-9], [2-6][0-9]\)$/);
  });

  it('prefers a bright red accent family on dark artwork when it clears AA contrast', () => {
    const result = getMediaReadableForeground({
      theme: 'glass',
      palette: {
        dominant: 'rgb(30, 29, 42)',
        vibrant: 'rgb(150, 44, 58)',
        darkMuted: 'rgb(20, 19, 30)',
        highlight: 'rgb(226, 221, 232)',
        gradientEnd: 'rgb(24, 22, 34)',
      },
      titleColor: '#ffffff',
      subtitleColor: '#d4d4d8',
      hasArtwork: true,
      backgroundColorOverride: 'rgb(29, 27, 41)',
    });

    expect(result.titleColor).toMatch(/^rgb\(/);
    expect(result.subtitleColor).toMatch(/^rgb\(/);
    expect(result.titleColor).not.toBe('#ffffff');
    expect(result.subtitleColor).not.toBe('#d4d4d8');
    expect(result.titleColor).not.toBe('#1f2937');
    expect(result.subtitleColor).not.toBe('#334155');
  });
});
