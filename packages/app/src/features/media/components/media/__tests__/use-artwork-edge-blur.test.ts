import { describe, expect, it } from 'vitest';
import { analyzeArtworkEdges, shouldBlurArtworkEdges } from '../use-artwork-edge-blur';

function createSyntheticImageData(
  width: number,
  height: number,
  colorAt: (x: number, y: number) => [number, number, number, number]
) {
  const data = new Uint8ClampedArray(width * height * 4);

  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const index = (y * width + x) * 4;
      const [r, g, b, a] = colorAt(x, y);
      data[index] = r;
      data[index + 1] = g;
      data[index + 2] = b;
      data[index + 3] = a;
    }
  }

  return {
    data,
    width,
    height,
  } as ImageData;
}

describe('shouldBlurArtworkEdges', () => {
  it('does not blur artwork with a solid edge color', () => {
    const imageData = createSyntheticImageData(48, 48, (x, y) => {
      const inCenterDetail = x >= 14 && x <= 34 && y >= 14 && y <= 34;
      return inCenterDetail ? [236, 225, 210, 255] : [28, 24, 36, 255];
    });

    expect(shouldBlurArtworkEdges(imageData)).toBe(false);
  });

  it('keeps blur for artwork with mixed edge colors', () => {
    const imageData = createSyntheticImageData(48, 48, (x, y) => {
      if (y < 6) return [228, 84, 96, 255];
      if (x >= 42) return [44, 182, 220, 255];
      if (y >= 42) return [238, 208, 120, 255];
      if (x < 6) return [76, 58, 182, 255];
      return [24, 24, 30, 255];
    });

    expect(shouldBlurArtworkEdges(imageData)).toBe(true);
  });

  it('skips blur when the exposed split edge already matches the card surface color', () => {
    const imageData = createSyntheticImageData(48, 48, (x, y) => {
      if (x >= 42) {
        return y % 2 === 0 ? [156, 42, 30, 255] : [170, 50, 34, 255];
      }

      if (y < 6) return [244, 225, 190, 255];
      if (x < 6) return [88, 210, 220, 255];
      if (y >= 42) return [246, 76, 64, 255];
      return [224, 64, 48, 255];
    });

    expect(
      analyzeArtworkEdges(imageData, {
        matchColor: 'rgb(160, 46, 32)',
        preferEdge: 'right',
      })
    ).toMatchObject({
      shouldBlur: false,
      shouldFadeEdge: false,
      edgeMatchesSurface: true,
      preferredEdgeColor: 'rgb(163, 46, 32)',
    });
  });

  it('defaults to blur when the visible border is mostly transparent', () => {
    const imageData = createSyntheticImageData(48, 48, (x, y) => {
      const inOpaqueCenter = x >= 10 && x <= 37 && y >= 10 && y <= 37;
      return inOpaqueCenter ? [20, 120, 200, 255] : [0, 0, 0, 0];
    });

    expect(shouldBlurArtworkEdges(imageData)).toBe(true);
  });
});
