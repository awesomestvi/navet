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

  it('switches to darker text for bright artwork outside glass theme', () => {
    const result = getMediaReadableForeground({
      theme: 'dark',
      palette: brightPalette,
      titleColor: '#ffffff',
      subtitleColor: '#d4d4d8',
      hasArtwork: true,
      backgroundColorOverride: 'rgb(236, 236, 236)',
    });

    expect(result.titleColor).toBe('#1f2937');
    expect(result.subtitleColor).toBe('#334155');
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
});
